---
title: "TIL: MySQL for Developers"
date: 2023-04-05T08:19:44-04:00
draft: true
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
- Use generated columns to create columns based on other columns based on an expression.

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
- 