var express = require('express') ;						//express
var body_parser = require('body-parser') ;				//body-parser
//var file = require('fs') ;
var url = require('url') ;
var path = require('path') ;							//path
var async = require('async') ;                          //async
var session = require('express-session') ;              //session
var cookieParser = require('cookie-parser') ;          //cookie-parser



/*自定义模块导入*/
var user = require('./modules/user1') ;
var speInfo = require('./modules/specificInfo') ;
var mydatabase = require('./modules/mysql') ;


/*数据库连接*/
// mydatabase.connect() ;


/*express设置*/
var app = express() ;
app.use(express.static('public') ) ;
app.set('views','./views') ;
app.set('view engine','html') ;
app.use(body_parser.urlencoded({extended:true})) ;
app.use(cookieParser('mySession')) ;
app.use(session({
    secret: 'mySession',
    resave: true,
    saveUninitialized: false
})) ;

/*跨域处理*/
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    if(req.method=="OPTIONS") res.send(200);/*让options请求快速返回*/
    else  next();
});


/*监听端口*/
var port = 8080 ;
app.listen(port,'0.0.0.0') ;
console.log("begin: "+ port) ;


/*路由设置*/
app.get('/',function(req,res){              //主页面
    async.waterfall([
        //查询
        function(callback){
            mydatabase.query( user.findUserQuery, function(err,result){
                var resu = result.length ;
                callback(err,resu) ;
            } ) ;
        }
    ],function(err,personNumber){
        if(err)
            console.log(err ) ;
        else{
            console.log( "server.js-- " +personNumber ) ;
            var welcomeName = '未登录' ;
            if( req.session.Cookie )
                welcomeName = req.session.Cookie.name ;
            res.render('./pages/index',{
                title: welcomeName
            }) ;
        }
    })
}) ;

//====================================用户============================================================

/*用户登录*/
app.post('/user/login',function(req,res){
  //  console.log( 'USER: login -- ' +req.body.username +" ---name"　+req.body.userpass +"----pass") ;
    async.waterfall([
        //查询
        function(callback){
            mydatabase.query( user.searchUserQuery, [req.body.username,req.body.userpass] , function(err,result){
                if(result == null || result=='' )
                    callback(null, 0) ;
                else{
                    var user = {
                        name: result[0].NAME,
                        id: result[0].ID,
                        minority: result[0].MINORITY
                    } ;
                    callback(null, user ) ;
                }
            } ) ;
        }
    ],function(err,myuser){
        if(err) {
            console.log(err);
            res.send('0') ;
        }else if(myuser == 0) {
            console.log("no such user ") ;
            res.send(false) ;
        }else{
            req.session.Cookie = myuser ;
            console.log( "login success-- " + req.session.Cookie) ;            
            res.send(true) ;

        }
    })
}) ;

/*用户注册*/
app.post('/user/add',function(req,res,next) {

//    console.log( 'USER: register -- ' +req.body.username +" --name"　+req.body.userpass +"--password" +req.body.minority +"--少数民族") ;
    async.waterfall([
        //查询
        function(callback){
            mydatabase.query( user.insertUserQuery, [req.body.username,req.body.userpass,req.body.minority] , function(err,result){
                callback(err, req.body.name)
                   
            } ) ;
        }
    ],function(err,myuser){
        if(err) {
            console.log(err);
            res.status(304) ;
        }
        else{
            console.log( "register success-- " +myuser) ;
            res.send('true');
        }
    })
})

/*退出登录*/
app.post('/user/logout',function(req,res){
    console.log('logout success-- ') ;
    req.session.Cookie = null ;
    res.send(true);
}) ;

/*获取个人信息*/
app.get('/user/self_info',function(req,res){        //talking
    var queryMean = req.query.message;
    console.log(req.query.message + "----" + req.session.Cookie);
    if (typeof(queryMean) == 'undefined') {
        if (req.session.Cookie) {
            res.send('暂无新的消息');
        }
        else
            res.send(false);
    } else {
        if ( req.session.Cookie) {
            var userID = req.session.Cookie.id;
            console.log("query: " + queryMean + " ID:" +userID);
            async.waterfall([
                    //查询
                    function (callback) {              
                        if ( queryMean == 'post') {
                            mydatabase.query(user.getSelfPostQuery, [userID], function (err, result) {
                                if (result == null || result == '')
                                    callback(null, {
                                        name: "info",
                                        result: '0'
                                    });
                                else {
                                    // console.log(result[0]);
                                    callback(null, {
                                        name: "info",
                                        result: result
                                    });
                                }
                            });
                        }else{
                            mydatabase.query(user.getSelfMessageQuery, [userID], function (err, result) {
                                if (result == null || result == '')
                                    callback(null, {
                                        name: "message",
                                        result: '0'
                                    });
                                else {
                                    callback(null, {
                                        name: "message",
                                        result: result
                                    });
                                }
                            });
                        }
                    }
                ], function (err, result) {
                    if (err) {
                        console.log(err);
                        res.send('失败');
                    }else {
                        res.send(result);
                    }
                });
        }else
            res.send(false);
    }
});
//====================================交流============================================================

/*发帖*/
app.post('/post',function(req,res){
    console.log("post: " + req.body.user +" : " +req.body.time +" -- " + req.body.title) ;
    if( req.session.Cookie) {
        var message = {
            user: req.session.Cookie.id,
            time: req.body.time,
            tag: req.body.tag,
            title: req.body.title,
            content: req.body.content
        };
        async.waterfall([
            //查询
            function (callback) {
                mydatabase.query(user.postMessageQueryWithTag, [message.user, message.tag, message.title, message.content, message.time], function (err, result) {
                    if (result == null || result == '')
                        callback(null, 0);
                    else {
                        console.log(req.body.user);
                        callback(null, req.body.user);
                    }
                });
            }
        ], function (err, myuser) {
            if (err) {
                console.log(err);
                res.send('0');
            } else if (myuser == 0) {
                console.log("post failed");
                res.send('0');
            } else {
                res.send('1');
            }
        })
    }else
        res.send('0');


}) ;

/*获取帖子信息*/
app.get('/talking/getPosts',function(req,res){
    console.log("get all posts") ;
    async.waterfall([
        //查询
        function(callback){
            mydatabase.query( user.getTotalMessageQuery , function(err,result){
                if(result == null || result=='' )
                    callback(err, 0) ;
                else {
                    callback(err, result);
                }
            } ) ;
        }
    ],function(err,info){
        if(err) {
            console.log(err);
            res.send('0 ') ;
        }else{
            console.log( "get all posts success-- " ) ;
            res.send(info) ;
        }
    })
}) ;


/*评论*/
app.post('/setComments',function(req,res){
    //评论
    console.log("comment--: " ) ; //+req.body.postID +" - " +req.body.commentTo +" - " + req.body.commentContent + " - " +req.body.commentTime) ;
    if(req.session.Cookie){
        async.waterfall([
            //查询
            function(callback){
                mydatabase.query( user.CommentMessageQuery, [req.session.Cookie.id,req.body.commentTo,req.body.postID,req.body.commentContent,req.body.commentTime] , function(err,result){
                    console.log("comment") ;
                    if(result == null || result=='' )
                        callback(null, 0) ;
                    else{
                        //console.log( "评论成功 result："　+ result[0]) ;
                        callback(null, '1' ) ;
                    }
                } ) ;
            }
        ],function(err,myuser){
            if(err) {
                console.log(err);
                res.send('0') ;
            }else if(myuser == 0) {
                console.log("comment failed") ;
                res.send('0') ;
            }else{
                console.log( "comment success");
                res.send( myuser) ;

            }
        })
    }else
        res.send('0') ;
}) ;

/*获取评论*/
app.get('/getComments',function(req,res){
    //评论
    console.log( "commit :" +req.query.id) ;
    async.waterfall([
        //查询
        function(callback){
            mydatabase.query(user.getTotalCommentQuery,[req.query.id],function (error,result) {
                console.log("get commits") ;
                if(result == null || result=='' )
                    callback(null, 0) ;
                else{
                    // console.log(result[0]) ;
                    callback(null, result ) ;
                }
            }) ;
        }
    ],function(err,result){
        if(err) {
            console.log(err);
            res.send('0') ;
        }else if(result == 0) {
            console.log('get commits failed') ;
            res.send('0') ;
        }else{
            res.send(result) ;
        }
    }) ;
}) ;

//====================================文化界面============================================================

//获取文化界面全部信息
app.get('/culture/spe_info',function(req,res){
    var info_index = parseInt(req.query.index)+1 ;
    console.log( info_index );
    async.waterfall([
        //查询
        function(callback){
            mydatabase.query(user.getTotalMessageQueryWithTag,[(info_index)],function (error,result) {
                 if(result == null || result=='' ) {
                    callback(null, '') ;
                 } else {
                    callback(null, result ) ;
                 }

            }) ;
        }
    ],function(err,result){
        res.send({
            info: speInfo[(speInfo.infoIndex[info_index])],
            talks: result
        });
    }) ;
   
}) ;








/*页面跳转*/
app.get('/culture',function(req,res){		//跳转culture页面
    // console.log("server.js--跳转vacation页面请求") ;
    res.render('./pages/culture',{
        title: '文化板块'
    }) ;
}) ;
app.get('/vacation',function(req,res){		//跳转vacation页面
    // console.log("server.js--跳转vacation页面请求") ;
    res.render('./pages/vacation',{
        title: '攻略攻略'
    }) ;
}) ;
app.get('/talking',function(req,res){		//talking
    res.render('./pages/talking',{
        title: '聊一聊'
    }) ;
}) ;
app.get('/store',function(req,res){		//talking
    // console.log("server.js--跳store页面请求") ;
    res.render('./pages/store',{
        title: '商品逛一逛'
    }) ;
}) ;
app.get('/new',function(req,res){		//talking
    // console.log("server.js--new页面请求") ;
    res.render('./pages/new',{
        title: '商品逛一逛'
    }) ;
}) ;


//提交申请
app.post('/other/tip',function(req,res){		
    console.log('tips');
    if(req.session.Cookie){
        
        async.waterfall([
            function (callback) {
                var userID = req.session.Cookie.id;
                mydatabase.query(user.getOtherTip, [userID, req.body.time, req.body.tag, req.body.x, req.body.y, req.body.info], function (err, result) {                    if (result == null || result == '')
                        callback(null, 0);
                    else {
                        console.log(req.body.user);
                        callback(null, req.body.user);
                    }
                });
            }
            ], function (err, myuser) {
                if (err) {
                    console.log(err);
                    res.send('0');
                } else if (myuser == 0) {
                    console.log("提交失败");
                    res.send('0');
                } else {
                    res.send('1');
                }
            })
    }else
        res.send('0');

}) ;
