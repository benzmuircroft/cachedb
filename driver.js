var fs=require('fs');
var copy=require(__dirname+'/../util/copy.js')({proto:true,circles:false});
var CODE=require(__dirname+'/../util/CODE.js');
var fast=require(__dirname+'/../util/to-fast-properties.js');
var dbUG=require(__dirname+'/../util/dbUG.js');
var cc=require(__dirname+'/../util/cc.js');
var SAFE={stringify:require(__dirname+'/../node_modules/json-stringify-safe')};
var EMPTY={NET:'live'};
var GUB={
    PUSH:function(BUG,o){
        if(BUG&&BUG.ACTIVE){
            BUG.PUSH(o);
            }
        return;
        }
    };
function date(d){
    if(!d){d=new Date();}
    var months=['Jan','Feb','Mar','Apr','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var day=d.getDay();
    var date=d.getDate();
    var month=d.getMonth();
    var hours=d.getHours();
    var minutes=d.getMinutes();
    var seconds=d.getSeconds();
    var ampm=hours>=12?'pm':'am';
    hours=hours%12;
    hours=hours?hours:12;
    minutes=minutes<10?'0'+minutes:minutes;
    seconds=seconds<10?'0'+seconds:seconds;
    var strTime=hours+':'+minutes+':'+seconds+ampm;
    return days[day]+' '+date+' '+months[month]+' '+strTime;
    }
var db=module.exports={
    name:undefined
,   previous:'protect'
,   current:'running'
,   manual_override_cb:undefined
,   log:function(BUG,d){
        if(typeof d=='string'&&d.indexOf('(Too Long To Log)')!==-1){
            d=d.split(']=');
            d[1]=d[1].split('>#>')[1];
            d=d[0]+']=(Too Long To Log) >#>'+d[1];
            }
        d=d.replace(/\>\#\>/g,' > ').replace(/\<\#\</g,'');
        if(global.L){global.L.log(d);}//d=d.replace(/\>\#\>/g,'\x1b[93m').replace(/\<\#\</g,'\x1b[0m');
        if(BUG&&BUG.AUDIT){GUB.PUSH(BUG,d);}
        return;
        }
,   mode:function(previous,current){
        db.previous=previous;
        db.current=current;
        if(previous=='protect'&&current=='running'){
            db.protect=false;
            db.log(EMPTY,'db mode is '+db.current);
            return;
            }
        else if(previous=='running'&&current=='protect'){
            db.protect=true;
            db.log(EMPTY,'db mode is '+db.current);
            return;
            }
        else if(['running','protect'].indexOf(previous)!==-1&&current=='shutdown'){
            db.protect=true;
            db.log(EMPTY,'db mode is '+db.current);
            db.mode=function(ignore){};
            db.shutdown=[setInterval(function(){
                var exit=true;
                for(var c in db.que){
                    for(var o in db.que[c]){if(db.que[c][o]&&db.que[c][o].length){exit=false;break;}}
                    }
                db.shutdown[1]+=1;
                if(exit||db.shutdown[1]>30){
                    clearInterval(db.shutdown[0]);
                    db.shutdown=function(){
                        throw new Error('CRASH!');
                        process.exit(1);
                        };
                    setTimeout(function(){db.shutdown();},20000);
                    }
                },1000),0];
            return;
            }
        }
,   load:function(name,cb){
        db.log(EMPTY,'cache.db v 1.0.0');
        db.name=name;
        fs.readdir(__dirname+'/tmp',function(e,f){
            (function remove_tmp(i){
                if(i<f.length){
                    fs.unlink(__dirname+'/tmp/'+f[i],function(){
                        remove_tmp((i+1));
                        });
                    }
                else{//end
                    fast(db);
                    db['live']=require(__dirname+'/../db/'+db.name+'_dbs.json');
                    db.prevent=copy(db['live']);
                    db.saver=copy(db['live']);
                    db.debug=copy(db['live']);
                    db.que=copy(db['live']);
                    db.block=copy(db['live']);
                    (function loop(i,folders){
                        fs.readdir(__dirname+'/../db/'+folders[i],function(e,f){
                            (function load_files(j){
                                if(j<f.length){
                                    if(f[j].split('.')[1]=='json'){
                                        var F=folders[i];
                                        var _id=f[j].split('.')[0];
                                        delete require.cache[__dirname+'/../db/'+F+'/'+f[j]];
                                        db['live'][F][_id]=require(__dirname+'/../db/'+F+'/'+f[j]);
                                        }
                                    setTimeout(function(j1){load_files(j1);},0,(j+1));
                                    }
                                else{//end
                                    if(i<folders.length-1){
                                        loop((i+1),folders);
                                        }
                                    else{
                                        db.backup();
                                        cb(db['live']);
                                        }
                                    }
                                })(0);
                            });
                        })(0,Object.keys(db['live']));
                    }
                })(0);
            });
        }
,   cron:undefined
,   backup:function(){
        clearInterval(db.cron);
        db.cron=setInterval(function(){
            if(!db.protect){
                fs.readdir(__dirname+'/backup',function(e,f){
                (function del_backups(i){
                    if(i<f.length){
                        if((+new Date(Number(f[0].split('.json')[0])))<((+new Date())-514229)){
                            fs.unlink(__dirname+'/backup/'+f[i],function(){
                                del_backups((i+1));
                                });
                            }
                        else{del_backups((i+1));}
                        }
                    else{//end
                        del_backups=i=undefined;
                        var d=(+new Date());
                        fs.writeFile(__dirname+'/backup/'+d+'.json',SAFE.stringify(db['live'],undefined,'\t'),function(e){
                            fs.open(__dirname+'/backup/'+d+'.json','r',function(e,fd){
                                if(e){db.log(EMPTY,e.stack.replace('Error','Backup #0'));}
                                else{
                                    fd=fd+0;//copy
                                    e=undefined;
                                    fs.fsync(fd,function(e){
                                        if(e){db.log(EMPTY,e.stack.replace('Error','Backup #1'));}
                                        else{
                                            try{
                                                fs.close(fd,function(){});
                                                }
                                            catch(e){
                                                db.log(EMPTY,e.stack.replace('Error','Backup #2'));
                                                }
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    })(0);
                });
            }
            },46368);
        return;
        }
,   del:function(BUG,F,_id,caller,cb){
        if(typeof F!=='string'||typeof _id!=='string'||typeof caller!=='string'||typeof cb!=='function'){throw new Error(['malformed params: ','F:',typeof F,'_id:',typeof _id,'caller:',typeof caller,'cb:',typeof cb,'caller:',caller]);}
        else  if(F=='test'){db.change(BUG,F,_id);}
        else if(!db[BUG.NET][F]){
            db.log(BUG,`db.del[`+BUG.NET+`][`+F+`] F NO EXIST >#>`+caller+`<#< `+(new Error().stack.replace('Error',':')));
            db.mode(db.current,'shutdown');
            }
        else{
            if(db[BUG.NET][F][_id]==undefined){
                db.log(BUG,`db.del[`+BUG.NET+`][`+F+`][`+_id+`] _id NO EXIST >#>`+caller+`<#< `+(new Error().stack.replace('Error',':')));
                db[BUG.NET][F][_id]={};
                if(BUG.NET=='live'){
                    delete db.debug[F][_id];
                    delete db.block[F][_id];
                    delete db.prevent[F][_id];
                    setTimeout(function(db,BUG,F,_id){
                        delete db[BUG.NET][F][_id];
                        },4181,db,BUG,F,_id);
                    }
                }
            else{
                var key=F+'/'+_id;
                if(BUG.BEFORE&&Object.keys(BUG.BEFORE[BUG.NET]).indexOf(key)==-1){//not seen (need to snapshot)
                    BUG.INDEX[BUG.NET][key]='G.db['+BUG.NET+']['+F+']['+_id+']';
                    BUG.BEFORE[BUG.NET][key]=copy(db['live'][F][_id]);//temp uses live
                    if(BUG.NET!=='live'){db[BUG.NET][F][_id]=copy(BUG.BEFORE[BUG.NET][key]);}//the actual snapshot!
                    BUG.LOCKED(BUG,F,_id);
                    }
                key=undefined;
                if(BUG.NET=='live'){db.prevent[F][_id]='Deleted by: '+caller+' and should stay deleted!';}
                try{
                    for(var k in db[BUG.NET][F][_id]){
                        if(k==_id){db[BUG.NET][F][_id][k]=undefined;}
                        else if(typeof db[BUG.NET][F][_id][k]=='string'){
                            if(isNaN(db[BUG.NET][F][_id][k])){db[BUG.NET][F][_id][k]='';}
                            else{db[BUG.NET][F][_id][k]="0"}
                            }
                        else if(typeof db[BUG.NET][F][_id][k]=='number'){
                            db[BUG.NET][F][_id][k]=0;
                            }
                        else if(Array.isArray(db[BUG.NET][F][_id][k])){
                            db[BUG.NET][F][_id][k]=[];
                            }
                        else if(typeof db[BUG.NET][F][_id][k]=='object'){
                            db[BUG.NET][F][_id][k]={};
                            }
                        }
                    }
                catch(e){}
                if(BUG.NET=='live'){
                    db[BUG.NET][F][_id].DELETED='Deleted by: '+caller+' and should stay deleted!';
                    db.unsort(BUG,F,_id);
                    fs.unlink(__dirname+'/../db/'+F+'/'+_id+'.json',function(){});
                    clearTimeout(db.saver[F][_id]);
                    db.saver[F][_id]=undefined;
                    delete db.saver[F][_id];
                    db.log(BUG,`db.del[`+BUG.NET+`][`+F+`][`+_id+`] OK >#>`+caller+`<#<`);
                    delete db[BUG.NET][F][_id];
                    clearTimeout(db.debug[F][_id]);
                    db.debug[F][_id]=undefined;
                    G.shell.exec('sleep 0.610;');
                    delete db.debug[F][_id];
                    delete db.block[F][_id];
                    delete db.prevent[F][_id];
                    db.change(BUG,F,_id);
                    }
                }
            cb(false);
            }
        }
,   rec:function(BUG,F,_id,caller,cb){
        if(typeof F!=='string'||typeof _id!=='string'||typeof caller!=='string'||typeof cb!=='function'){throw new Error(['malformed params: ','F:',typeof F,'_id:',typeof _id,'caller:',typeof caller,'cb:',typeof cb,'caller:',caller]);}
        else  if(BUG.NET!=='live'){
            db.change(BUG,F,_id);
            cb('test');
            }
        else if(!db[BUG.NET][F]){
            db.log(BUG,`db.rec[`+BUG.NET+`][`+F+`] F NO EXIST >#>`+caller+`<#< `+(new Error().stack.replace('Error',':')));
            db.mode(db.current,'shutdown');
            }
        else if(!db[BUG.NET][F][_id]){
            db.log(BUG,`db.rec[`+BUG.NET+`][`+F+`][`+_id+`] _id NO EXIST >#>`+caller+`<#< `+(new Error().stack.replace('Error',':')));
            db.mode(db.current,'shutdown');
            }
        else{
            if(typeof db.prevent[F][_id]!=='string'){delete db.prevent[F][_id];}//stops an odd bug (last seen after adding divi or logging in after)
            var e;
            try{JSON.parse(SAFE.stringify(db[BUG.NET][F][_id]));}catch(error){e=error.stack;}
            if([undefined,'undefined'].indexOf(db[BUG.NET][F][_id])!==-1){e=e?(e+'\nJSON.parse result is also undefined'):(new Error('JSON.parse result is undefined').stack);}
            if(e){
                db.log(BUG,`db.rec[`+BUG.NET+`][`+F+`][`+_id+`] JSON ERROR >#>`+caller+`<#< `+(e.replace('Error',':')));
                fs.writeFileSync(__dirname+'/../SETTINGS/BUGS/'+F+'.'+_id+'.db',new Error('NON-JSON').stack);
                cb(e);
                }
            else if(!db.prevent[F][_id]){
                if(db.que[F][_id]&&db.que[F][_id].length>4){
                    db.log(BUG,`db.rec[`+BUG.NET+`][`+F+`][`+_id+`] SAVE AT THE END OF THE QUEUE ... >#>`+caller+`<#<`);
                    }
                else{
                    clearTimeout(db.saver[F][_id]);
                    db.saver[F][_id]=setTimeout(function(F,_id){db.save(F,_id);},377,F,_id);
                    db.saver[F][_id].for='db['+BUG.NET+']'+F+'.'+_id;
                    }
                db.log(BUG,`db.rec[`+BUG.NET+`][`+F+`][`+_id+`] OK >#>`+caller+`<#<`);
                db.change(BUG,F,_id);
                cb('saving');
                }
            else{
                db.log(BUG,`db.rec[`+BUG.NET+`][`+F+`][`+_id+`] BOUNCE >#>`+caller+`<#<\n`+db.prevent[F][_id]);
                db.change(BUG,F,_id);
                cb('bounce');
                }
            }
        }
,   save:function(F,_id){
        delete db.saver[F][_id];
        var tmp=CODE.encrypt(+new Date());
        fs.writeFile(__dirname+'/tmp/'+F+'.'+_id+'.'+tmp,SAFE.stringify(db['live'][F][_id],undefined,'\t'),function(e){
            if(e){
                fs.unlink(__dirname+'/tmp/'+F+'.'+_id+'.'+tmp,function(){
                    tmp=undefined;
                    db.log(EMPTY,`db.save[live][`+F+`][`+_id+`] #0 `+(e.stack.replace('Error',':')));
                    });
                }
            else{
                fs.rename(__dirname+'/tmp/'+F+'.'+_id+'.'+tmp,__dirname+'/../db/'+F+'/'+_id+'.json',function(e){
                    tmp=undefined;
                    if(e){
                        db.log(EMPTY,`db.save[live][`+F+`][`+_id+`] #1 `+(e.stack.replace('Error',':')));
                        }
                    else{
                        fs.open(__dirname+'/../db/'+F+'/'+_id+'.json','r',function(e,fd){
                            if(e){
                                db.log(EMPTY,`db.save[live][`+F+`][`+_id+`] #2 `+(e.stack.replace('Error',':')));
                                }
                            else{
                                fd=fd+0;//copy
                                e=undefined;
                                fs.fsync(fd,function(e){
                                    if(e){
                                        db.log(EMPTY,`db.save[live][`+F+`][`+_id+`] #3 `+(e.stack.replace('Error',':')));
                                        }
                                    else{
                                        try{
                                            fs.close(fd,function(){
                                                fs.readFile(__dirname+'/../db/'+F+'/'+_id+'.json',{'flag':'rs'},function(e,d){});//force the reading before allowing any more writing try to stop >> [kernel:[2907168.541979] EXT4-fs (sda1): failed to convert unwritten extents to written extents -- potential data loss!  (inode 38535418, error -30)]
                                                });
                                            }
                                        catch(e){
                                            db.log(EMPTY,`db.save[live][`+F+`][`+_id+`] #4 `+(e.stack.replace('Error',':')));
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
,   fs:undefined
,   protect:undefined//if this is on db.wait will not let anything new pass through
,   prevent:undefined//cant add files during/after delete
,   block:undefined//tell users to join que
,   saver:undefined//don't save straight away (used only for saving)
,   debug:undefined//print caller if wait gets stuck
,   que:undefined//cb queue
,   wait:function(BUG,F,_id,caller,cb){
        if(!db.protect){
            db.log(BUG,`db.wait[`+BUG.NET+`][`+F+`][`+_id+`] ... >#>`+caller+`<#<`);
            if(typeof F!=='string'||typeof _id!=='string'||typeof caller!=='string'||typeof cb!=='function'){
                throw new Error('malformed params: F='+(typeof F)+' _id='+(typeof _id)+' caller='+(typeof caller)+' cb='+(typeof cb)+' caller='+caller);
                }
            var key=F+'/'+_id;
            if(BUG.BEFORE&&Object.keys(BUG.BEFORE[BUG.NET]).indexOf(key)==-1){//not seen (need to snapshot)
                BUG.INDEX[BUG.NET][key]='G.db['+BUG.NET+']['+F+']['+_id+']';
                BUG.BEFORE[BUG.NET][key]=copy(db['live'][F][_id]);//temp uses live
                if(BUG.NET!=='live'){db[BUG.NET][F][_id]=copy(BUG.BEFORE[BUG.NET][key]);}//the actual snapshot!
                BUG.LOCKED(BUG,F,_id);
                }
            key=undefined;
            if(!db.block[F][_id]||((BUG.STEPS||['live'])[0]!=='live'&&BUG.NET=='live'&&db.block[F][_id]&&db.block[F][_id].indexOf((BUG.STEPS||['NoCoNfLiCt'])[0])==8)){//can do now (if not blocked OR test was started but is live now and blocked but blocked by the test)
                db.log(BUG,`db.wait[`+BUG.NET+`][`+F+`][`+_id+`] GO! >#>`+caller+`<#<`);
                db.block[F][_id]='db.wait['+BUG.NET+']['+F+']['+_id+'] at '+caller+' '+date()+(new Error().stack.replace('Error','Stack'));
                clearTimeout(db.debug[F][_id]);
                db.debug[F][_id]=setTimeout(function(BUG,F,_id,caller){
                    db.log(BUG,`db.wait[`+BUG.NET+`][`+F+`][`+_id+`] NEVER UNBLOCKED, DID THE JOB LAST TOO LONG? >#>`+caller+`<#< (Blocked by self `+db.block[F][_id]+`?)`);
                    },46368,BUG,F,_id,caller);
                cb(BUG);
                }
            else{//add to que
                if(BUG.OPTS&&typeof BUG.OPTS.call=='string'&&typeof db.moretime=='function'){
                    var ms=2000;
                    for(var i=0;i<(db.que[F][_id]||[]).length;i+=1){
                        ms+=2000;
                        }
                    db.moretime(BUG,ms);
                    }
                if(!db.que[F][_id]||!Array.isArray(db.que[F][_id])){db.que[F][_id]=[];}
                db.que[F][_id]=db.que[F][_id].concat([[cb,caller,BUG,new Error().stack.replace('Error','Stack')]]);
                db.log(BUG,`db.wait[`+BUG.NET+`][`+F+`][`+_id+`] ... QUEUED [`+db.que[F][_id].length+`] >#>`+(new Error().stack.replace('Error',caller))+`<#< (Blocked by `+db.block[F][_id]+`?)`);
                }
            }
        }
,   change:function(BUG,F,_id){
        if(typeof F!=='string'||typeof _id!=='string'){throw new Error('malformed params: F='+(typeof F)+' _id='+(typeof _id));}
        clearTimeout(db.debug[F][_id]);
        db.debug[F][_id]=undefined;//quick
        delete db.debug[F][_id];
        db.block[F][_id]=undefined;//quick
        delete db.block[F][_id];
        if(db.que[F][_id]&&db.que[F][_id].length){
            setTimeout(function(BUG,F,_id){db.shift(BUG,F,_id);},13,BUG,F,_id);
            if(BUG&&BUG.AUDIT){
                BUG.AUDIT.push('db.change['+BUG.NET+']['+F+']['+_id+'] EXIT <#<');
                }
            }
        else if(BUG&&BUG.AUDIT){
            delete db.que[F][_id];
            BUG.AUDIT.push('db.change['+BUG.NET+']['+F+']['+_id+'] EXIT <#< (end of queue for this db item)');
            }
        return true;
        }
,   shift:function(BUG,F,_id){
        if(db.que[F][_id]&&db.que[F][_id].length){
            var next=db.que[F][_id].splice(0,1)[0];//same as shift
            var test=(Array.isArray(next)&&typeof next[0]=='function');
            db.log(BUG,'db.shift['+BUG.NET+']['+F+']['+_id+'] Can do next task? '+test);
            if(test){
                test=undefined;
                db.block[F][_id]=next[1]+' '+next[3];//original caller + stack
                db.debug[F][_id]=setTimeout(function(BUG,F,_id,caller){
                    BUG,db.log(BUG,`db.wait[`+BUG.NET+`][`+F+`][`+_id+`] (QUEUED) THIS IS STILL BLOCKED, DID THE JOB LAST TOO LONG? >#>`+caller+`<#< (Blocked by `+db.block[F][_id]+`?)`);
                    },46368,BUG,F,_id,next[1]);
                next[0](next[2]);//return the next bug object
                if((db.que[F][_id]||[]).length==0){delete db.que[F][_id];}
                }
            else if(db.que[F][_id]&&db.que[F][_id].length){db.shift(BUG,F,_id,undefined);}
            }
        }
,   sorts:{}
,   sort:function(BUG,F,cat,_id,val){
        if(BUG.NET=='live'){
            db.unsort(BUG,F,cat,_id);
            if(!db.sorts[F]){db.sorts[F]={};}
            if(!db.sorts[F][cat]){db.sorts[F][cat]={};}
            db.sorts[F][cat][_id]=val;
            }
        return;
        }
,   unsort:function(BUG,F,_id){
        if(BUG.NET=='live'){
            var k=Object.keys((db.sorts[F]||{}));
            for(var i=0,l=k.length;i<l;i+=1){
                delete ((db.sorts[F]||{})[k[i]]||{})[_id];
                }
            }
        return;
        }
,   calc:function(BUG,F,_id,x,operator,input,note){//note is '( + name val )'
        var key=F+'/'+_id;
        if(BUG.BEFORE&&Object.keys(BUG.BEFORE[BUG.NET]).indexOf(key)==-1){//not seen (need to snapshot)
            BUG.INDEX[BUG.NET][key]='G.db['+BUG.NET+']['+F+']['+_id+']';
            BUG.BEFORE[BUG.NET][key]=copy(db['live'][F][_id]);//temp uses live
            if(BUG.NET!=='live'){db[BUG.NET][F][_id]=copy(BUG.BEFORE[BUG.NET][key]);}//the actual snapshot!
            }
        var before,after;
        if(x[4]!==undefined){
            before=copy(db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]][x[4]]);
            db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]][x[4]]=cc[operator](db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]][x[4]],input);
            after=copy(db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]][x[4]]);
            db.log(BUG,`db.calc[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`][`+x[3]+`][`+x[4]+`] `+before+` `+(operator=='add'?`+`:`-`)+` `+input+` = `+after+` >#>`+note+`<#<`);
            }
        else if(x[3]!==undefined){
            before=copy(db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]]);
            db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]]=cc[operator](db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]],input);
            after=copy(db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]]);
            db.log(BUG,`db.calc[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`][`+x[3]+`] `+before+` `+(operator=='add'?`+`:`-`)+` `+input+` = `+after+` >#>`+note+`<#<`);
            }
        else if(x[2]!==undefined){
            before=copy(db[BUG.NET][F][_id][x[0]][x[1]][x[2]]);
            db[BUG.NET][F][_id][x[0]][x[1]][x[2]]=cc[operator](db[BUG.NET][F][_id][x[0]][x[1]][x[2]],input);
            after=copy(db[BUG.NET][F][_id][x[0]][x[1]][x[2]]);
            db.log(BUG,`db.calc[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`] `+before+` `+(operator=='add'?`+`:`-`)+` `+input+` = `+after+` >#>`+note+`<#<`);
            }
        else if(x[1]!==undefined){
            before=copy(db[BUG.NET][F][_id][x[0]][x[1]]);
            db[BUG.NET][F][_id][x[0]][x[1]]=cc[operator](db[BUG.NET][F][_id][x[0]][x[1]],input);
            after=copy(db[BUG.NET][F][_id][x[0]][x[1]]);
            db.log(BUG,`db.calc[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`] `+before+` `+(operator=='add'?`+`:`-`)+` `+input+` = `+after+` >#>`+note+`<#<`);
            }
        else if(x[0]!==undefined){
            before=copy(db[BUG.NET][F][_id][x[0]]);
            db[BUG.NET][F][_id][x[0]]=cc[operator](db[BUG.NET][F][_id][x[0]],input);
            after=copy(db[BUG.NET][F][_id][x[0]]);
            db.log(BUG,`db.calc[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`] `+before+` `+(operator=='add'?`+`:`-`)+` `+input+` = `+after+` >#>`+note+`<#<`);
            }
        else{
            before=copy(db[BUG.NET][F][_id]);
            db[BUG.NET][F][_id]=cc[operator](db[BUG.NET][F][_id],input);
            after=copy(db[BUG.NET][F][_id]);
            db.log(BUG,`db.calc[`+BUG.NET+`][`+F+`][`+_id+`] `+before+` `+(operator=='add'?`+`:`-`)+` `+input+` = `+after+` >#>`+note+`<#<`);
            }
        dbUG(F,x,after);
        key=before=after=undefined;
        return;
        }
,   mod:function(BUG,F,_id,x,answer,note){//note is '( + name val )'
        var key=F+'/'+_id;
        if(BUG.BEFORE&&Object.keys(BUG.BEFORE[BUG.NET]).indexOf(key)==-1){//not seen (need to snapshot)
            BUG.INDEX[BUG.NET][key]='G.db['+BUG.NET+']['+F+']['+_id+']';
            BUG.BEFORE[BUG.NET][key]=copy(db['live'][F][_id]);//temp uses live
            if(BUG.NET!=='live'){db[BUG.NET][F][_id]=copy(BUG.BEFORE[BUG.NET][key]);}//the actual snapshot!
            }
        dbUG(F,x,answer);
        if(x[4]!==undefined){
            db.log(BUG,`db.mod[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`][`+x[3]+`][`+x[4]+`]=`+answer+` >#>`+note+`<#<`);
            db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]][x[4]]=answer;
            }
        else if(x[3]!==undefined){
            db.log(BUG,`db.mod[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`][`+x[3]+`]=`+answer+` >#>`+note+`<#<`);
            db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]]=answer;
            }
        else if(x[2]!==undefined){
            db.log(BUG,`db.mod[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`]=`+answer+` >#>`+note+`<#<`);
            db[BUG.NET][F][_id][x[0]][x[1]][x[2]]=answer;
            }
        else if(x[1]!==undefined){
            db.log(BUG,`db.mod[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`]=`+answer+` >#>`+note+`<#<`);
            db[BUG.NET][F][_id][x[0]][x[1]]=answer;
            }
        else if(x[0]!==undefined){
            db.log(BUG,`db.mod[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`]=`+answer+` >#>`+note+`<#<`);
            db[BUG.NET][F][_id][x[0]]=answer;
            }
        else{
            db.log(BUG,`db.mod[`+BUG.NET+`][`+F+`][`+_id+`]=`+answer+` >#>`+note+`<#<`);
            db[BUG.NET][F][_id]=answer;
            }
        key=undefined;
        return;
        }
,   cut:function(BUG,F,_id,x){
        var key=F+'/'+_id;
        if(BUG.BEFORE&&Object.keys(BUG.BEFORE[BUG.NET]).indexOf(key)==-1){//not seen (need to snapshot)
            BUG.INDEX[BUG.NET][key]='G.db['+BUG.NET+']['+F+']['+_id+']';
            BUG.BEFORE[BUG.NET][key]=copy(db['live'][F][_id]);//temp uses live
            if(BUG.NET!=='live'){db[BUG.NET][F][_id]=copy(BUG.BEFORE[BUG.NET][key]);}//the actual snapshot!
            }
        if(x[4]!==undefined){
            db.log(BUG,`db.cut[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`][`+x[3]+`][`+x[4]+`]`);
            delete db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]][x[4]];
            }
        else if(x[3]!==undefined){
            db.log(BUG,`db.cut[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`][`+x[3]+`]`);
            delete db[BUG.NET][F][_id][x[0]][x[1]][x[2]][x[3]];
            }
        else if(x[2]!==undefined){
            db.log(BUG,`db.cut[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`][`+x[2]+`]`);
            delete db[BUG.NET][F][_id][x[0]][x[1]][x[2]];
            }
        else if(x[1]!==undefined){
            db.log(BUG,`db.cut[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`][`+x[1]+`]`);
            delete db[BUG.NET][F][_id][x[0]][x[1]];
            }
        else if(x[0]!==undefined){
            db.log(BUG,`db.cut[`+BUG.NET+`][`+F+`][`+_id+`][`+x[0]+`]`);
            delete db[BUG.NET][F][_id][x[0]];
            }
        key=undefined;
        return;
        }
    };
