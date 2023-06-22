import {
  Program,
  web3,
  BN,
  Provider,
  Wallet,
  AnchorProvider,
} from "@coral-xyz/anchor";
import { Signer } from "@solana/web3.js";
import * as Token from "@solana/spl-token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { parse as uuidParse } from "uuid";

import { IDL, HapiCoreSolana } from "../target/types/hapi_core_solana";
import {
  bufferFromString,
  addrToSeeds,
  padBuffer,
  uuidToBn,
  bnToUuid,
  stakeConfiguration,
  rewardConfiguration,
  ReporterRole,
  ReporterRoleKeys,
  CaseStatus,
  CaseStatusKeys,
  CategoryKeys,
  Category,
} from ".";

export function encodeAddress(address: string): Buffer {
  return padBuffer(Buffer.from(address), 64);
}

export function decodeAddress(address: Buffer | Uint8Array | number[]): string {
  if (!(address instanceof Buffer)) {
    address = Buffer.from(address);
  }

  return address.filter((b) => b).toString();
}

export class HapiCoreProgram {
  program: Program<HapiCoreSolana>;
  programId: web3.PublicKey;

  constructor(hapiCoreProgramId: string | web3.PublicKey, provider?: Provider) {
    this.programId =
      typeof hapiCoreProgramId === "string"
        ? new web3.PublicKey(hapiCoreProgramId)
        : hapiCoreProgramId;

    this.program = new Program(IDL, this.programId, provider);
  }

  public findProgramDataAddress() {
    return web3.PublicKey.findProgramAddressSync(
      [this.programId.toBytes()],
      new web3.PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
    );
  }

  public findNetworkAddress(name: string) {
    return web3.PublicKey.findProgramAddressSync(
      [bufferFromString("network"), bufferFromString(name, 32)],
      this.programId
    );
  }

  public findReporterAddress(network: web3.PublicKey, reporterId: string) {
    return web3.PublicKey.findProgramAddressSync(
      [bufferFromString("reporter"), network.toBytes(), uuidParse(reporterId)],
      this.programId
    );
  }

  public findCaseAddress(network: web3.PublicKey, caseId: string) {
    return web3.PublicKey.findProgramAddressSync(
      [bufferFromString("case"), network.toBytes(), uuidParse(caseId)],
      this.programId
    );
  }

  public findAddressAddress(network: web3.PublicKey, address: Buffer) {
    return web3.PublicKey.findProgramAddressSync(
      [bufferFromString("address"), network.toBytes(), ...addrToSeeds(address)],
      this.programId
    );
  }

  public findAssetAddress(
    network: web3.PublicKey,
    mint: Buffer,
    assetId: Buffer | Uint8Array
  ) {
    return web3.PublicKey.findProgramAddressSync(
      [
        bufferFromString("asset"),
        network.toBytes(),
        ...addrToSeeds(mint),
        assetId,
      ],
      this.programId
    );
  }

  public findConfirmationAddress(account: web3.PublicKey, reporterId: string) {
    return web3.PublicKey.findProgramAddressSync(
      [
        bufferFromString("confirmation"),
        account.toBytes(),
        uuidParse(reporterId),
      ],
      this.programId
    );
  }

  public async InitializeNetwork(
    name: string,
    stakeConfiguration: stakeConfiguration,
    rewardConfiguration: rewardConfiguration,
    rewardMint: web3.PublicKey,
    stakeMint: web3.PublicKey
  ) {
    const [network, bump] = this.findNetworkAddress(name);
    const [programData] = this.findProgramDataAddress();

    await Token.getOrCreateAssociatedTokenAccount(
      this.program.provider.connection,
      ((this.program.provider as AnchorProvider).wallet as NodeWallet).payer,
      stakeMint,
      network,
      true
    );

    const transactionHash = await this.program.methods
      .createNetwork(
        bufferFromString(name, 32).toJSON().data,
        stakeConfiguration,
        rewardConfiguration,
        bump
      )
      .accounts({
        authority: this.program.provider.publicKey,
        network,
        rewardMint,
        stakeMint,
        programAccount: this.program.programId,
        programData,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    return transactionHash;
  }

  public async getNetwotkData(name: string) {
    const [network] = this.findNetworkAddress(name);
    let data = await this.program.account.network.fetch(network);

    return data;
  }

  public async getReporterData(networkName: string, id: string) {
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, id);
    let data = await this.program.account.reporter.fetch(reporter);

    return data;
  }

  public async getCaseData(networkName: string, id: string) {
    const [network] = this.findNetworkAddress(networkName);
    const [caseAccount] = this.findCaseAddress(network, id);

    let data = await this.program.account.case.fetch(caseAccount);

    return data;
  }

  public async getAddressData(networkName: string, address: Buffer | string) {
    const addr =
      typeof address === "string" ? Buffer.from(address, "hex") : address;
    const [network] = this.findNetworkAddress(networkName);
    const [addressAccount] = this.findAddressAddress(network, addr);

    let data = await this.program.account.address.fetch(addressAccount);

    return data;
  }

  public async getAllReporters(networkName: string) {
    const [network] = this.findNetworkAddress(networkName);
    let data = await this.program.account.reporter.all();
    const res = data.filter((acc) => acc.account.network === network);

    return res;
  }

  public async getAllCases(networkName: string) {
    const [network] = this.findNetworkAddress(networkName);
    let data = await this.program.account.case.all();
    const res = data.filter((acc) => acc.account.network === network);

    return res;
  }

  public async getAllAddresses(networkName: string) {
    const [network] = this.findNetworkAddress(networkName);
    let data = await this.program.account.address.all();
    const res = data.filter((acc) => acc.account.network === network);

    return res;
  }

  public async setAuthority(networkName: string, address: web3.PublicKey) {
    const [network] = this.findNetworkAddress(networkName);
    const [programData] = this.findProgramDataAddress();

    const transactionHash = await this.program.methods
      .setAuthority()
      .accounts({
        authority: this.program.provider.publicKey,
        newAuthority: address,
        network,
        programAccount: this.programId,
        programData,
      })
      .rpc();

    return transactionHash;
  }

  public async updateStakeConfiguration(
    networkName: string,
    token?: web3.PublicKey,
    unlockDuration?: number,
    validatorStake?: string,
    tracerStake?: string,
    publisherStake?: string,
    authorityStake?: string,
    appraiserStake?: string
  ) {
    const [network] = this.findNetworkAddress(networkName);
    let networkData = await this.program.account.network.fetch(network);
    let stakeMint = token ?? networkData.stakeMint;

    const stakeConfiguration = {
      unlockDuration: unlockDuration
        ? new BN(unlockDuration)
        : networkData.stakeConfiguration.unlockDuration,
      validatorStake: validatorStake
        ? new BN(validatorStake)
        : networkData.stakeConfiguration.validatorStake,
      tracerStake: tracerStake
        ? new BN(tracerStake)
        : networkData.stakeConfiguration.tracerStake,
      publisherStake: publisherStake
        ? new BN(publisherStake)
        : networkData.stakeConfiguration.publisherStake,
      authorityStake: authorityStake
        ? new BN(authorityStake)
        : networkData.stakeConfiguration.authorityStake,
      appraiserStake: appraiserStake
        ? new BN(appraiserStake)
        : networkData.stakeConfiguration.appraiserStake,
    };

    const transactionHash = await this.program.methods
      .updateStakeConfiguration(stakeConfiguration)
      .accounts({
        authority: this.program.provider.publicKey,
        network: network,
        stakeMint,
      })
      .rpc();

    return transactionHash;
  }

  public async updateRewardConfiguration(
    networkName: string,
    token?: web3.PublicKey,
    addressTracerReward?: string,
    addressConfirmationReward?: string,
    assetTracerReward?: string,
    assetConfirmationReward?: string
  ) {
    const [network] = this.findNetworkAddress(networkName);
    let networkData = await this.program.account.network.fetch(network);
    let rewardMint = token ?? networkData.rewardMint;

    const rewardConfiguration = {
      addressTracerReward: addressTracerReward
        ? new BN(addressTracerReward)
        : networkData.rewardConfiguration.addressTracerReward,
      addressConfirmationReward: addressConfirmationReward
        ? new BN(addressConfirmationReward)
        : networkData.rewardConfiguration.addressConfirmationReward,
      assetTracerReward: assetTracerReward
        ? new BN(assetTracerReward)
        : networkData.rewardConfiguration.assetTracerReward,
      assetConfirmationReward: assetConfirmationReward
        ? new BN(assetConfirmationReward)
        : networkData.rewardConfiguration.assetConfirmationReward,
    };

    const transactionHash = await this.program.methods
      .updateRewardConfiguration(rewardConfiguration)
      .accounts({
        authority: this.program.provider.publicKey,
        network,
        rewardMint,
      })
      .rpc();

    return transactionHash;
  }

  async createReporter(
    networkName: string,
    id: string,
    role: ReporterRoleKeys,
    account: web3.PublicKey,
    name: string,
    url: string
  ) {
    const [network] = this.findNetworkAddress(networkName);
    const [reporterAccount, bump] = this.findReporterAddress(network, id);

    const transactionHash = await this.program.methods
      .createReporter(
        uuidToBn(id),
        account,
        name,
        ReporterRole[role],
        url,
        bump
      )
      .accounts({
        authority: this.program.provider.publicKey,
        reporter: reporterAccount,
        network,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    return transactionHash;
  }

  async updateReporter(
    networkName: string,
    id: string,
    role?: ReporterRoleKeys,
    account?: web3.PublicKey,
    name?: string,
    url?: string
  ) {
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, id);
    const reporterData = await this.program.account.reporter.fetch(reporter);

    const reporterRole = role ? ReporterRole[role] : reporterData.role;
    const reporterUrl = url ?? reporterData.url;
    const reporterAccount = account ?? reporterData.account;
    const reporterName = name ?? reporterData.name.toString();

    const transactionHash = await this.program.methods
      .updateReporter(reporterAccount, reporterName, reporterRole, reporterUrl)
      .accounts({
        authority: this.program.provider.publicKey,
        reporter,
        network,
      })
      .rpc();

    return transactionHash;
  }

  async activateReporter(
    networkName: string,
    wallet: Signer | Wallet,
    id: string
  ) {
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, id);
    const networkData = await this.program.account.network.fetch(network);

    let signer = wallet as Signer;

    const networkStakeTokenAccount = Token.getAssociatedTokenAddressSync(
      networkData.stakeMint,
      network,
      true
    );

    const reporterStakeTokenAccount = Token.getAssociatedTokenAddressSync(
      networkData.stakeMint,
      signer.publicKey
    );

    const transactionHash = await this.program.methods
      .activateReporter()
      .accounts({
        signer: signer.publicKey,
        network,
        reporter,
        networkStakeTokenAccount,
        reporterStakeTokenAccount,
        tokenProgram: Token.TOKEN_PROGRAM_ID,
      })
      .signers([signer as Signer])
      .rpc();

    return transactionHash;
  }

  async deactivateReporter(
    networkName: string,
    wallet: Signer | Wallet,
    id: string
  ) {
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, id);
    let signer = wallet as Signer;

    const transactionHash = await this.program.methods
      .deactivateReporter()
      .accounts({
        signer: signer.publicKey,
        network,
        reporter,
      })
      .signers([signer])
      .rpc();

    return transactionHash;
  }

  async unstake(networkName: string, wallet: Signer | Wallet, id: string) {
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, id);
    const networkData = await this.program.account.network.fetch(network);

    let signer = wallet as Signer;

    const networkStakeTokenAccount = Token.getAssociatedTokenAddressSync(
      networkData.stakeMint,
      network,
      true
    );

    const reporterStakeTokenAccount = Token.getAssociatedTokenAddressSync(
      networkData.stakeMint,
      signer.publicKey
    );

    const transactionHash = await this.program.methods
      .unstake()
      .accounts({
        signer: signer.publicKey,
        network,
        reporter,
        networkStakeTokenAccount,
        reporterStakeTokenAccount,
        tokenProgram: Token.TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

    return transactionHash;
  }

  async createCase(
    networkName: string,
    id: string,
    name: string,
    url: string,
    wallet: Signer | Wallet,
    reporterId: string
  ) {
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, reporterId);
    const [caseAccount, bump] = this.findCaseAddress(network, id);

    let signer = wallet as Signer;

    const transactionHash = await this.program.methods
      .createCase(uuidToBn(id), name, url, bump)
      .accounts({
        sender: signer.publicKey,
        network,
        reporter,
        case: caseAccount,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc();

    return transactionHash;
  }

  async updateCase(
    networkName: string,
    reporterId: string,
    id: string,
    wallet: Signer | Wallet,
    name?: string,
    url?: string,
    status?: CaseStatusKeys
  ) {
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, reporterId);
    const [caseAccount] = this.findCaseAddress(network, id);

    const caseData = await this.program.account.case.fetch(caseAccount);
    const caseStatus = status
      ? CaseStatus[status]
      : (caseData.status as (typeof CaseStatus)[keyof typeof CaseStatus]);
    const caseUrl = url ?? caseData.url;
    const caseName = name ?? caseData.name.toString();

    let signer = wallet as Signer;

    const transactionHash = await this.program.methods
      .updateCase(caseName, caseUrl, caseStatus)
      .accounts({
        sender: signer.publicKey,
        network,
        reporter,
        case: caseAccount,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    return transactionHash;
  }

  async createAddress(
    networkName: string,
    address: string,
    category: CategoryKeys,
    riskScore: number,
    caseId: string,
    wallet: Signer | Wallet,
    reporterId: string
  ) {
    let buf = Buffer.from(address, "hex");
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, reporterId);
    const [caseAccount] = this.findCaseAddress(network, caseId);
    const [addressAccount, bump] = this.findAddressAddress(network, buf);

    let signer = wallet as Signer;

    const transactionHash = await this.program.methods
      .createAddress([...buf], Category[category], riskScore, bump)
      .accounts({
        sender: signer.publicKey,
        network,
        reporter,
        case: caseAccount,
        address: addressAccount,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc();

    return transactionHash;
  }

  async updateAddress(
    networkName: string,
    address: string,
    wallet: Signer | Wallet,
    reporterId: string,
    category?: CategoryKeys,
    riskScore?: number,
    caseId?: string
  ) {
    let buf = Buffer.from(address, "hex");
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, reporterId);
    const [addressAccount] = this.findAddressAddress(network, buf);

    const addressData = await this.program.account.address.fetch(
      addressAccount
    );

    const addressCategory = category
      ? Category[category]
      : addressData.category;
    const addressRiskScore = riskScore ?? addressData.riskScore;
    const addressCaseId = caseId ?? bnToUuid(addressData.caseId);
    const [caseAccount] = this.findCaseAddress(network, addressCaseId);

    let signer = wallet as Signer;

    const transactionHash = await this.program.methods
      .updateAddress(addressCategory, addressRiskScore)
      .accounts({
        sender: signer.publicKey,
        network,
        reporter,
        case: caseAccount,
        address: addressAccount,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc();

    return transactionHash;
  }

  async confirmAddress(
    networkName: string,
    address: string,
    wallet: Signer | Wallet,
    reporterId: string
  ) {
    let buf = Buffer.from(address, "hex");
    const [network] = this.findNetworkAddress(networkName);
    const [reporter] = this.findReporterAddress(network, reporterId);
    const [addressAccount] = this.findAddressAddress(network, buf);
    const [confirmationAccount, bump] = this.findConfirmationAddress(
      addressAccount,
      reporterId
    );

    let signer = wallet as Signer;

    const transactionHash = await this.program.methods
      .confirmAddress(bump)
      .accounts({
        sender: signer.publicKey,
        network,
        reporter,
        address: addressAccount,
        confirmation: confirmationAccount,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc();

    return transactionHash;
  }
}
