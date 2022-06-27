#!/bin/bash

### VARIABLES ###

home="/shinev2"
backup_path="/shinev2/backup"

date_format="+%Y-%m-%d"
today=`date $date_format`

cd $backup_path
# backup database
docker exec -t shinev2-production pg_dump -c -U admin shinev2_production  > $backup_path/dump_shinev2_production_$today.sql
docker exec -t shinev2-staging pg_dump -c -U admin shinev2_staging  > $backup_path/dump_shinev2_staging_$today.sql

#mv staging_$today.tar.gz $backup_path
#mv production_th_$today.tar.gz $backup_path

# find and delete old file
find $backup_path -mtime +30 -type f -delete

echo "Backup done!!!"