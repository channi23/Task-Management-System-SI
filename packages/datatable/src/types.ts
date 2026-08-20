export interface QueryParams{
    pageIndex:number;
    pageSize:number;
    sortBy?:string;
    sortDir?:'asc'|'desc';
    filters?: Record<string,string>;
}
export interface QueryResult<T>{
    rows:T[];
    totalRows:number;
}
export interface DataSource<T>{
    fetch(params:QueryParams):Promise<QueryResult<T>>;
}
