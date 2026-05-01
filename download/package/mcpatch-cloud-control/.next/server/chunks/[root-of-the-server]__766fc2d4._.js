module.exports=[43793,e=>{"use strict";var t=e.i(63021);let r=globalThis.prisma??new t.PrismaClient({log:[]});e.s(["db",0,r])},63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},54799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},42958,e=>{"use strict";var t=e.i(54799);function r(){let{publicKey:e,privateKey:r}=t.default.generateKeyPairSync("rsa",{modulusLength:2048,publicKeyEncoding:{type:"spki",format:"pem"},privateKeyEncoding:{type:"pkcs8",format:"pem"}});return{publicKey:e,privateKey:r}}function a(e,r){let a=t.default.createSign("RSA-SHA256");return a.update(e,"utf8"),a.end(),a.sign({key:r,padding:t.default.constants.RSA_PKCS1_PADDING},"base64")}function n(e){let r=t.default.createHash("sha256").update(e).digest("hex");return r.toUpperCase().match(/.{2}/g)?.join(":")||r.toUpperCase()}function i(){return t.default.randomBytes(32).toString("hex")}function s(e,r,a,n,i){try{let s,o,l=(s=`${r}${a}${n}`,(o=t.default.createHmac("sha256",e)).update(s,"utf8"),o.digest("hex")),u=Math.max(l.length,i.length),d=Buffer.alloc(u,0),c=Buffer.alloc(u,0);return Buffer.from(l,"utf8").copy(d),Buffer.from(i,"utf8").copy(c),t.default.timingSafeEqual(d,c)&&l.length===i.length}catch{return!1}}function o(e){if(!e||0===e.length)throw Error("密钥不能为空");let r=Buffer.from(e,"hex"),a=t.default.randomBytes(r.length),n=t.default.randomBytes(r.length),i=Buffer.alloc(r.length);for(let e=0;e<r.length;e++)i[e]=r[e]^a[e]^n[e];return{frag1:a.toString("hex"),frag2:n.toString("hex"),frag3:i.toString("hex")}}function l(e,t,r){let a=Buffer.from(e,"hex"),n=Buffer.from(t,"hex"),i=Buffer.from(r,"hex");if(a.length!==n.length||n.length!==i.length)throw Error("碎片长度不一致，无法还原密钥");let s=Buffer.alloc(a.length);for(let e=0;e<a.length;e++)s[e]=a[e]^n[e]^i[e];return s.toString("hex")}function u(){return t.default.randomBytes(16).toString("hex")}function d(e,r){let a=Buffer.from(r,"hex");if(16!==a.length)throw Error("AES-128 密钥必须为 16 字节");let n=t.default.randomBytes(16),i=t.default.createCipheriv("aes-128-cbc",a,n),s=i.update(e,"utf8","base64");return{encrypted:s+=i.final("base64"),iv:n.toString("hex")}}let c=new Map,p=!1;function h(e){let t=parseInt(e,10);if(isNaN(t))return{valid:!1,error:"时间戳格式无效"};let r=Date.now()-(t<1e12?1e3*t:t);return r>3e5?{valid:!1,error:"时间戳已过期（超过5分钟）"}:r<-6e4?{valid:!1,error:"时间戳超前过多（超过1分钟）"}:{valid:!0}}function f(e){return!!c.has(e)||(c.set(e,{expiresAt:Date.now()+36e4}),!1)}function g(){c.clear()}function m(){let e=`mcpatch-cert-${Date.now()}-${t.default.randomBytes(16).toString("hex")}`,r=t.default.createHash("sha256").update(e).digest("hex");return r.toUpperCase().match(/.{2}/g)?.join(":")||r.toUpperCase()}function x(e){return e.replace(/:/g,"").toLowerCase()}function y(e){let t=e.trim().replace(/:/g,"").toUpperCase();if(!/^[0-9A-F]+$/.test(t))throw Error("指纹格式无效，必须为十六进制字符串");if(64!==t.length)throw Error(`SHA-256 指纹长度应为 64 个十六进制字符，当前为 ${t.length} 个`);return t.match(/.{2}/g)?.join(":")||t}p=!0,setInterval(()=>{let e=Date.now();for(let[t,r]of c.entries())r.expiresAt<e&&c.delete(t)},6e4),e.s(["assembleKeyFrom3Fragments",()=>l,"clearSignatureCache",()=>g,"encryptConfig",()=>d,"formatFingerprintForJava",()=>x,"generateAESKey",()=>u,"generateCertFingerprint",()=>m,"generateHMACSecret",()=>i,"generateRSAKeyPair",()=>r,"getPublicKeyFingerprint",()=>n,"isSignatureReplay",()=>f,"normalizeFingerprint",()=>y,"signData",()=>a,"splitKeyTo3Fragments",()=>o,"validateTimestamp",()=>h,"verifyHMACSignature",()=>s])},36700,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),n=e.i(59756),i=e.i(61916),s=e.i(74677),o=e.i(69741),l=e.i(16795),u=e.i(87718),d=e.i(95169),c=e.i(47587),p=e.i(66012),h=e.i(70101),f=e.i(26937),g=e.i(10372),m=e.i(93695);e.i(52474);var x=e.i(220),y=e.i(43793),v=e.i(49632),R=e.i(4323),w=e.i(54799),E=e.i(89171),S=e.i(42958);async function C(e){try{let t,{username:r,password:a}=await e.json();if("string"!=typeof r||"string"!=typeof a)return E.NextResponse.json({error:"用户名和密码必须为字符串"},{status:400});if(!r||!a)return E.NextResponse.json({error:"请提供用户名和密码"},{status:400});if(r.length<2||r.length>32)return E.NextResponse.json({error:"用户名长度需在 2-32 个字符之间"},{status:400});if(a.length<6)return E.NextResponse.json({error:"密码至少 6 位"},{status:400});let{publicKey:n,privateKey:i}=(0,S.generateRSAKeyPair)(),s=(0,S.generateHMACSecret)(),o=(0,S.splitKeyTo3Fragments)(s),l=Buffer.from(i,"utf8").toString("hex"),u=(0,S.splitKeyTo3Fragments)(l),d=(0,S.generateAESKey)(),c=(0,S.generateCertFingerprint)(),p=`mcpatch_${w.default.randomBytes(24).toString("hex")}`,h=`# Mcpatch 云控配置文件
# 此文件由云控管理后台生成和管理

# 更新服务器地址
urls:
  - mcpatch://127.0.0.1:6700

# 客户端版本号文件路径
version-file-path: version-label.txt

# 更新失败时是否允许继续进入游戏
allow-error: false

# 无更新时是否显示提示
show-no-update-message: true

# 有更新时是否显示更新日志
show-has-update-message: true

# 自动关闭更新日志的时间（毫秒），0为手动关闭
auto-close-changelogs: 0

# 安静模式，仅下载时显示窗口
silent-mode: false

# 是否禁用界面主题
disable-theme: false

# 窗口标题
window-title: Mcpatch

# 更新起始目录
base-path: ''

# 私有协议超时时间（毫秒）
private-timeout: 7000

# HTTP协议超时时间（毫秒）
http-timeout: 7000

# HTTP自定义请求头
http-headers: {}

# 重试次数
retries: 3

# 是否忽略SSL证书验证
ignore-ssl-cert: false

# 是否忽略HTTP Content-Length校验
ignore-http-content-length: false

# 测试模式
test-mode: false

# 最大并行下载线程数（0为自动）
max-threads: 0

# 分片下载大小（字节）
chunk-size: 1048576

# 最大分片数
max-chunks: 16

# 是否启用分片下载
enable-chunked-download: true

# 是否启用防盗链鉴权
anti-hotlink-enabled: true

# 鉴权API地址
anti-hotlink-auth-url: https://auth-api.mxzysoa.com/generate-auth-url

# 鉴权有效期（秒）
anti-hotlink-expire-time: 3600

# 鉴权用户ID
anti-hotlink-uid: "0"
`,f=R.default.load(h,{schema:R.default.JSON_SCHEMA});try{t=await y.db.$transaction(async e=>{if(await e.adminUser.findFirst())throw Error("ALREADY_INITIALIZED");let t=await v.default.hash(a,12),i=await e.adminUser.create({data:{username:r,passwordHash:t}});return await e.cloudConfig.create({data:{version:1,yamlData:h,jsonData:JSON.stringify(f),isActive:!0,changeNote:"系统初始化 - 默认配置"}}),await e.apiKey.create({data:{key:p,name:"默认密钥"}}),await e.securityConfig.create({data:{rsaPublicKey:n,rsaPrivateKey:"",hmacSecret:"",hmacFrag1:o.frag1,hmacFrag2:o.frag2,hmacFrag3:o.frag3,rsaPrivFrag1:u.frag1,rsaPrivFrag2:u.frag2,rsaPrivFrag3:u.frag3,aesKey:d,certFingerprint:c}}),i})}catch(e){if("ALREADY_INITIALIZED"===e.message)return E.NextResponse.json({error:"系统已初始化，已有管理员账户"},{status:400});throw e}return E.NextResponse.json({success:!0,message:"系统初始化完成（已启用 6 层安全防护）",admin:{id:t.id,username:t.username},apiKey:p,security:{rsaKeyGenerated:!0,hmacSecretGenerated:!0,aesKeyGenerated:!0,keyFragmentationEnabled:!0,certFingerprintGenerated:!0}})}catch(e){return console.error("[/api/init POST] 内部错误:",e),E.NextResponse.json({error:"服务器内部错误"},{status:500})}}async function A(){try{let e=await y.db.adminUser.count();return E.NextResponse.json({initialized:e>0})}catch(e){return console.error("[/api/init GET] 内部错误:",e),E.NextResponse.json({error:"服务器内部错误"},{status:500})}}e.s(["GET",()=>A,"POST",()=>C],95592);var b=e.i(95592);let T=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/init/route",pathname:"/api/init",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/init/route.ts",nextConfigOutput:"standalone",userland:b}),{workAsyncStorage:N,workUnitAsyncStorage:P,serverHooks:k}=T;function j(){return(0,a.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:P})}async function F(e,t,a){T.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/init/route";y=y.replace(/\/index$/,"")||"/";let v=await T.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!v)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:R,params:w,nextConfig:E,parsedUrl:S,isDraftMode:C,prerenderManifest:A,routerServerContext:b,isOnDemandRevalidate:N,revalidateOnlyGenerated:P,resolvedPathname:k,clientReferenceManifest:j,serverActionsManifest:F}=v,H=(0,o.normalizeAppPath)(y),I=!!(A.dynamicRoutes[H]||A.routes[k]),K=async()=>((null==b?void 0:b.render404)?await b.render404(e,t,S,!1):t.end("This page could not be found"),null);if(I&&!C){let e=!!A.routes[k],t=A.dynamicRoutes[H];if(t&&!1===t.fallback&&!e){if(E.experimental.adapterPath)return await K();throw new m.NoFallbackError}}let D=null;!I||T.isDev||C||(D="/index"===(D=k)?"/":D);let _=!0===T.isDev||!I,O=I&&!_;F&&j&&(0,s.setManifestsSingleton)({page:y,clientReferenceManifest:j,serverActionsManifest:F});let B=e.method||"GET",U=(0,i.getTracer)(),q=U.getActiveScopeSpan(),M={params:w,prerenderManifest:A,renderOpts:{experimental:{authInterrupts:!!E.experimental.authInterrupts},cacheComponents:!!E.cacheComponents,supportsDynamicResponse:_,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:E.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>T.onRequestError(e,t,a,n,b)},sharedContext:{buildId:R}},$=new l.NodeNextRequest(e),L=new l.NodeNextResponse(t),G=u.NextRequestAdapter.fromNodeNextRequest($,(0,u.signalFromNodeResponse)(t));try{let s=async e=>T.handle(G,M).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=U.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${B} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${B} ${y}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var i,l;let u=async({previousCacheEntry:r})=>{try{if(!o&&N&&P&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await s(n);e.fetchMetrics=M.renderOpts.fetchMetrics;let l=M.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let u=M.renderOpts.collectedTags;if(!I)return await (0,p.sendResponse)($,L,i,M.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(i.headers);u&&(t[g.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,a=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:x.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await T.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:O,isOnDemandRevalidate:N})},!1,b),t}},d=await T.handleResponse({req:e,nextConfig:E,cacheKey:D,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:N,revalidateOnlyGenerated:P,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:o});if(!I)return null;if((null==d||null==(i=d.value)?void 0:i.kind)!==x.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",N?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,h.fromNodeOutgoingHttpHeaders)(d.value.headers);return o&&I||m.delete(g.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,f.getCacheControlHeader)(d.cacheControl)),await (0,p.sendResponse)($,L,new Response(d.value.body,{headers:m,status:d.value.status||200})),null};q?await l(q):await U.withPropagatedContext(e.headers,()=>U.trace(d.BaseServerSpan.handleRequest,{spanName:`${B} ${y}`,kind:i.SpanKind.SERVER,attributes:{"http.method":B,"http.target":e.url}},l))}catch(t){if(t instanceof m.NoFallbackError||await T.onRequestError(e,t,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:O,isOnDemandRevalidate:N})},!1,b),I)throw t;return await (0,p.sendResponse)($,L,new Response(null,{status:500})),null}}e.s(["handler",()=>F,"patchFetch",()=>j,"routeModule",()=>T,"serverHooks",()=>k,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>P],36700)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__766fc2d4._.js.map