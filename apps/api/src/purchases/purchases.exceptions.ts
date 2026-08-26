// Sentinel thrown to abort+rollback the transaction when a concurrent
// request already claimed the last unit between our precheck and the
// atomic decrement below — distinct from a thrown PG error.
export class SoldOutError extends Error {}
