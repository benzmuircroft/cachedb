# cachedb

A node.js json file database that reads writes to cache before the files. it is a db queue system for working with numbers

#

```
delete require.cache['/home/database_js/driver.js'];
G.db=require('/home/database_js/driver.js');
G.db.load('database-name',function(){//your db name here

    G.db.mode('protect',(G.DB_MODE='running'));
    
    ... more code
    
    });
```


can be referenced to
```
var exists=G.db['live'].tx[txs[i]].status.replace('bulked inside ','');
```

wait till item is unlocked or call back instantly causing lock
```
G.db.wait(EMPTY,'tx',txs[i],ln('delete stray already bulked because txs bulk exists'),function(EMPTY){});
```
modify
```
G.db.mod(EMPTY,'tx',txs[i],['status'],'bulking'+io,`status = bulking`+io);
```

save
```
G.db.rec(EMPTY,'table','item',ln('recording data to db'),function(){});
```
