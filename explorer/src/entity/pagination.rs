use async_graphql::{Enum, InputObject, InputType, OutputType, SimpleObject};

use super::{
    address::{
        model::Model as Address,
        query_utils::{AddressCondition, AddressFilter},
    },
    asset::{
        model::Model as Asset,
        query_utils::{AssetCondition, AssetFilter},
    },
    case::{
        model::Model as Case,
        query_utils::{CaseCondition, CaseFilter},
    },
};

const DEFAULT_PAGE_NUM: u64 = 1;
const DEFAULT_PAGE_SIZE: u64 = 25;

/// A convenience wrapper for pagination
#[derive(Clone, Eq, PartialEq, InputObject, Debug)]
pub struct Paginator {
    pub page_num: u64,
    pub page_size: u64,
}

impl Default for Paginator {
    fn default() -> Self {
        Self {
            page_num: DEFAULT_PAGE_NUM,
            page_size: DEFAULT_PAGE_SIZE,
        }
    }
}

/// A convenience wrapper for ordering
#[derive(Enum, Copy, Clone, Eq, PartialEq, Default, Debug)]
pub enum Ordering {
    #[default]
    Asc,
    Desc,
}

/// A paginated response for an entity
#[derive(Clone, Debug, Eq, PartialEq, SimpleObject)]
#[graphql(concrete(name = "AddressPage", params(Address)))]
#[graphql(concrete(name = "AssetPage", params(Asset)))]
#[graphql(concrete(name = "CasePage", params(Case)))]
pub struct EntityPage<Entity: Send + Sync + OutputType> {
    /// The page of data being returned
    pub data: Vec<Entity>,
    /// The total number of rows available
    pub total: u64,
    /// The number of pages available
    pub page_count: u64,
}

/// Reusable input type for all entities
#[derive(Clone, Default, Eq, PartialEq, InputObject, Debug)]
#[graphql(concrete(name = "AddressInput", params(AddressFilter, AddressCondition)))]
#[graphql(concrete(name = "AssetInput", params(AssetFilter, AssetCondition)))]
#[graphql(concrete(name = "CaseInput", params(CaseFilter, CaseCondition)))]
pub struct EntityInput<F: InputType, C: InputType> {
    /// Conditions to filter entities by
    pub filtering: Option<F>,

    /// Available ordering
    pub ordering: Ordering,

    /// Available ordering values for entities
    pub ordering_condition: C,

    /// Pagination options
    pub pagination: Option<Paginator>,
}
