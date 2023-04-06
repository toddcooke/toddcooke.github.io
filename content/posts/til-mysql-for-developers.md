---
title: "TIL: MySQL for Developers"
date: 2023-04-05T08:19:44-04:00
draft: false
tags:
- MySQL
- Databases
- TIL
---

I've been watching the excellent [MySQL for Developers](https://planetscale.com/courses/mysql-for-developers) course,
and the name is accurate. I took a SQL course in college, used SQL here and there professionally, but never really
learned more than the basics. This course is great intermediate next step.

The following are some things I found especially helpful.

## Schema

- Use the data type that reflects what you are modeling, use Date for dates, use Decimal for exact values.
- Use the smallest that works for your use case. Smaller values make queries faster. If you are representing the years
  someone could live, TINYINT can go up to 255 which is enough.
- Use generated columns to create columns based on other columns with  an expression.

## Indexes

- B+ trees are how everything is stored. The leaf nodes contain the entire row.
- Use a bigint for the primary key so that the B  tree doesn't have to balance as often (as it would with UUIDs)
- Cardinality is the number of distinct values in a column that an index covers.
- Selectivity is how unique the values in a column are. Higher selectivity = better query performance.
- Prefix indexing is good for UUIDs and hashes, but prevents you from ordering and grouping.
- Composite indexes are indexes on multiple columns.
    - Saves space, because instead of having 3 copies of data for 3 indexes, you can have one index on 3 columns.
    - Rules: left to right, no skipping. Stops at the first range.
    - Tips: common equality conditions should be first. Range conditions and less used columns should come after first.
- Functional indexes are good if you want to use a builtin function, like MONTH(some_date). Can also use a generated
  column.
- Making an index invisible is a good way to test if deleting an index would have any unforeseen effects.

## Queries
- Explain gives you an estimate of a queries performance:
  - Possible keys - the indexes that could have been used
  - Key - the index that will be used
  - Key Length - the amount of the index that will be used, a composite index may only use the first column.
- Explain has a type column which tells you how the query will be run:
  - const - query by primary key. 
    - select * from people where id = 1;
  - ref - query by index. 
    - select * from people where first_name = "john";
  - fulltext - query by full text index
    - select * from people where match(first_name) against('john');
  - range - query by index then scan through leaf nodes
    - select * from people where first_name < "john";
  - index - scan entire index
    - select first_name from people where first_name != "john";
  - all - scan entire table
    - select * from people;
- Index obfuscation - a query of an indexed column where a function prevents the use of the index
  - Instead of 
    - select * from film where length / 60 < 2;
  - Move functions to other side of the operator:
    - select * from film where length < 2 * 60
- Redundant condition is an additional condition which does not change the result set
- Approximate condition is an additional condition which narrows down the result set using an index and allows another more precise but non-indexed condition to get exactly the desired results.
  - select * from items where price * tax < 100 and price < 100
- Select only what you need. Instead of select *, only select column you will use. This is especially important for large datatypes which are expensive to fetch like text and blob
- count(*) gets number of rows in table
- count(some_nullable_column) gets count of non-null values of column
- Joins are very expensive if they don't use indexes. Use explain to see if a query is using an index or not.
- Use subqueries to filter joined data
  - select * from customer where id in (select customer_id from payment where amount > 5.99)
  - Avoid using distinct, as distinct joins tables then throws duplicates away
- Common Table Expressions (CTEs) are away to save a query like a function then call it later on
- Recursive CTEs are a way to generate data
- Union stacks results on top of another
- Union all does not remove duplicates, much faster
- Window functions allow you to do aggregations on each row, eg a running total
- When ordering, add id after the column you are ordering by, which will give you deterministic results
  - select id, birthday from people order by birthday, id 
- Counting
  ```
  select 
  count(*) as total, 
  count(return_date) as completed_rentals,
  count(if(DAYOFWEEK(rental_date) in (1,7), 1, null)) as weekend_rentals,
  count(if(DAYOFWEEK(rental_date) in (1,7), null, 1)) as weekday_rentals,
  from rental;
  ```
- Use <=> when comparing null with other values
  - null = 1 -- returns null
  - null <=> 1 -- returns 0 (false)
- COALESCE(col1,col2,...) selects the first non-null value. Good if you have preferred and fallback columns
- Large columns can't be indexed normally, but you can use an MD5 hash of the column and index that 
  - ALTER TABLE urls ADD COLUMN url_md5 binary(16) GENERATED ALWAYS AS (UNHEX(MD5(url)));
- MD5 indexes can also be made from multiple columns
- Use timestamps instead of booleans for archived_at, created_at, deleted_at, etc. Default value can be null
- MySQL can be used as a lightweight way to claim rows
  - update imports set owner = 32, available = 0 where owner = 0 and available = 1 limit 1;
- Summary table / rollup table
  - Create a table for summary data
  - Add aggregated data to summary table on regular basis
  - Union the latest data to the summary table
- Offset+Limit pagination
  - Pros - easy to implement, user-friendly, makes pages directly addressable 
  - Cons - records can drift as you page through if they are added/removed, deeper navigation is more expensive
- Cursor based pagination
  - Pros - handling drifting rows, good for infinite scroll
  - Cons - no directly addressing pages, more complicated implementation