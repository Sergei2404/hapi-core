import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import { fixtureWithReporters } from "../setup";
import { Category, randomId } from "../util";

describe("HapiCore: Address", function () {
  it("Should be able to create an address", async function () {
    const { hapiCore, wallets, reporters } = await loadFixture(
      fixtureWithReporters
    );

    const case1 = {
      id: randomId(),
      name: "big hack 2023",
      url: "https://big.hack",
    };

    await hapiCore
      .connect(wallets.authority)
      .createCase(case1.id, case1.name, case1.url);

    const address = {
      addr: "0x9DDE9F8b85e4c4278545549e4eDF2E3E9d2c890E",
      caseId: case1.id,
      reporterId: reporters.publisher.id,
      risk: 5,
      category: Category.Hacker,
    };

    await expect(
      await hapiCore
        .connect(wallets.publisher)
        .createAddress(
          address.addr,
          address.caseId,
          address.risk,
          address.category
        )
    )
      .to.emit(hapiCore, "AddressCreated")
      .withArgs(address.addr, address.risk, address.category);

    expect(await hapiCore.getAddress(address.addr)).to.deep.equal([
      address.addr,
      address.caseId,
      address.reporterId,
      0,
      address.risk,
      address.category,
    ]);

    expect(await hapiCore.getAddressCount()).to.equal(1);

    expect(await hapiCore.getAddresses(10, 0)).to.deep.equal([
      [
        address.addr,
        address.caseId,
        address.reporterId,
        0,
        address.risk,
        address.category,
      ],
    ]);
  });

  it("Should return empty address if not found", async function () {
    const { hapiCore } = await loadFixture(fixtureWithReporters);

    expect(
      await hapiCore.getAddress("0x9DDE9F8b85e4c4278545549e4eDF2E3E9d2c890E")
    ).to.deep.equal([
      "0x0000000000000000000000000000000000000000",
      0,
      0,
      0,
      0,
      0,
    ]);
  });

  it("Should be able to update an address", async function () {
    const { hapiCore, wallets, reporters } = await loadFixture(
      fixtureWithReporters
    );

    const case1 = {
      id: randomId(),
      name: "big hack 2023",
      url: "https://big.hack",
    };

    const case2 = {
      id: randomId(),
      name: "child abuse case #1488",
      url: "https://child.abuse",
    };

    const address = {
      addr: "0xc0fFF558F848ffDB39251186c6A0c598010a3615",
      caseId: case1.id,
      reporterId: reporters.publisher.id,
      risk: 5,
      category: Category.Hacker,
    };

    await Promise.all([
      hapiCore
        .connect(wallets.publisher)
        .createCase(case1.id, case1.name, case1.url),
      hapiCore
        .connect(wallets.publisher)
        .createCase(case2.id, case2.name, case2.url),
      hapiCore
        .connect(wallets.publisher)
        .createAddress(
          address.addr,
          address.caseId,
          address.risk,
          address.category
        ),
    ]);

    await expect(
      await hapiCore
        .connect(wallets.publisher)
        .updateAddress(address.addr, 10, Category.ChildAbuse, case1.id)
    )
      .to.emit(hapiCore, "AddressUpdated")
      .withArgs(address.addr, 10, Category.ChildAbuse);

    expect(await hapiCore.getAddress(address.addr)).to.deep.equal([
      address.addr,
      address.caseId,
      address.reporterId,
      0,
      10,
      Category.ChildAbuse,
    ]);
  });

  it("Tracer shouldn't be able to change address case", async function () {
    const { hapiCore, wallets, reporters } = await loadFixture(
      fixtureWithReporters
    );

    const case1 = {
      id: randomId(),
      name: "big hack 2023",
      url: "https://big.hack",
    };
    const case2 = {
      id: randomId(),
      name: "child abuse case #1488",
      url: "https://child.abuse",
    };
    const address = {
      addr: "0xc0fFF558F848ffDB39251186c6A0c598010a3615",
      caseId: case1.id,
      reporterId: reporters.publisher.id,
      risk: 5,
      category: Category.Hacker,
    };

    await Promise.all([
      hapiCore
        .connect(wallets.publisher)
        .createCase(case1.id, case1.name, case1.url),
      hapiCore
        .connect(wallets.publisher)
        .createCase(case2.id, case2.name, case2.url),
      hapiCore
        .connect(wallets.tracer)
        .createAddress(
          address.addr,
          address.caseId,
          address.risk,
          address.category
        ),
    ]);

    await expect(
      hapiCore
        .connect(wallets.tracer)
        .updateAddress(address.addr, 10, Category.ChildAbuse, case2.id)
    ).to.be.revertedWith("Tracer can't change case");
  });
});
