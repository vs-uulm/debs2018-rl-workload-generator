#!/usr/bin/env sh

SHARDS=10

for workload in workloads/*; do
    name=$(basename $workload .js)
    mkdir -p out/${name}

    for i in $(seq 0 $(($SHARDS-1))); do
        shard=$(printf %02d $i)
        node index.js ${name} $i $SHARDS 1> out/${name}/${name}-${shard}.sh 2> out/${name}/${name}-${shard}.txt
    done
done
