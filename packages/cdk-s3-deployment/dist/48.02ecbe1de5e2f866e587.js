(window.webpackJsonp=window.webpackJsonp||[]).push([[48],{M5VJ:function(e,n,i){"use strict";i.r(n),i.d(n,"ClientReviewsModule",(function(){return b}));var t=i("tyNb"),r=i("IfdK"),o=i("2jMA"),c=i("PnPc"),s=i("Y9WU"),a=i("fXoL"),f=i("pMDz"),v=function(){function e(e,n,i,t){this.sessionService=e,this.redirectService=n,this.envConfigLoader=i,this.analyticsService=t}return e.prototype.ngOnInit=function(){var e=this.sessionService.customerInfo.customer_id,n=this.sessionService.sessionKey,i="local_api"===this.envConfigLoader.getEnvConfig().env?"dev":this.envConfigLoader.getEnvConfig().env,t=this.redirectService.getCurrentDomain();this.iframePath="https://reviews."+t+"/admin/login?customer_id="+e+"&session_key="+n+"&env="+i,this.analyticsService.trackEvent("[Client Reviews] View Page")},e.\u0275fac=function(n){return new(n||e)(a.Pb(r.a),a.Pb(o.a),a.Pb(c.a),a.Pb(s.a))},e.\u0275cmp=a.Jb({type:e,selectors:[["client-reviews"]],decls:3,vars:3,consts:[["id","iframeContainer"],["frameborder","0",3,"src"]],template:function(e,n){1&e&&(a.Vb(0,"div",0),a.Qb(1,"iframe",1),a.jc(2,"safeResourceUrl"),a.Ub()),2&e&&(a.Cb(1),a.qc("src",a.kc(2,1,n.iframePath),a.Jc))},pipes:[f.a],styles:["#iframeContainer[_ngcontent-%COMP%]{position:fixed;width:100%;height:100%}#iframeContainer[_ngcontent-%COMP%]   iframe[_ngcontent-%COMP%]{display:block;width:100%;height:calc(100vh - 70px)}"]}),e}(),u=i("p20J"),h=i("Coov"),p=function(){function e(e,n,i){this.permissionsService=e,this.snackBar=n,this.router=i}return e.prototype.canActivateChild=function(e){var n=this.permissionsService.hasEmployeePermission(h.a.ReviewsScreen);return n||(this.snackBar.open("You do not have permission to view client reviews.","",{duration:5e3}),this.router.navigate(["/Services"])),n},e.\u0275fac=function(n){return new(n||e)(a.ac(h.c),a.ac(u.a),a.ac(t.g))},e.\u0275prov=a.Lb({token:e,factory:e.\u0275fac}),e}(),d=[{path:"",canActivate:[i("bcfW").b],canActivateChild:[p],component:v,children:[{path:"",component:v,data:{key:"ClientReviewPage"},pathMatch:"full"}]}],l=function(){function e(){}return e.\u0275mod=a.Nb({type:e}),e.\u0275inj=a.Mb({factory:function(n){return new(n||e)},imports:[[t.k.forChild(d)],t.k]}),e}(),m=i("PCNd"),b=function(){function e(){}return e.\u0275mod=a.Nb({type:e}),e.\u0275inj=a.Mb({factory:function(n){return new(n||e)},providers:[p],imports:[[l,m.a]]}),e}()}}]);