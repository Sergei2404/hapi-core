pub use sea_orm_migration::prelude::*;

mod m20231127_140636_create_address;
mod m20231127_160838_create_asset;
mod m20231127_161317_create_reporter;
mod m20231127_162130_create_case;
mod m20231127_162603_create_category_type;
mod m20231127_165849_create_reporter_role_type;
mod m20231127_170357_create_reporter_status_type;
mod m20231127_170630_create_case_status_type;
mod m20231205_131413_create_network;
mod m20231211_164133_create_network_backend;

pub(crate) use m20231127_162603_create_category_type::Category;
pub(crate) use m20231127_165849_create_reporter_role_type::ReporterRole;
pub(crate) use m20231127_170357_create_reporter_status_type::ReporterStatus;
pub(crate) use m20231127_170630_create_case_status_type::CaseStatus;
pub(crate) use m20231211_164133_create_network_backend::NetworkBackend;

pub(crate) use m20231127_161317_create_reporter::Reporter;
pub(crate) use m20231127_162130_create_case::Case;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20231211_164133_create_network_backend::Migration),
            Box::new(m20231205_131413_create_network::Migration),
            Box::new(m20231127_162603_create_category_type::Migration),
            Box::new(m20231127_165849_create_reporter_role_type::Migration),
            Box::new(m20231127_170357_create_reporter_status_type::Migration),
            Box::new(m20231127_161317_create_reporter::Migration),
            Box::new(m20231127_170630_create_case_status_type::Migration),
            Box::new(m20231127_162130_create_case::Migration),
            Box::new(m20231127_140636_create_address::Migration),
            Box::new(m20231127_160838_create_asset::Migration),
        ]
    }
}
