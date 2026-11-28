import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
const start=app.indexOf("const V7_ICE_M_TO_FT=");
const end=app.indexOf("const V7_CREASE_RADIUS_UNITS=",start);
assert.ok(start>0&&end>start,"The saved rink model and visual layers must exist");
const ctx={
 clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),
 round:(n,places=2)=>Math.round(n*10**places)/10**places
};
const node=(tag,attributes={})=>({
 tag,attributes,children:[],
 append(...children){this.children.push(...children)}
});
ctx.v7IceSvg=node;
ctx.svgEl=node;
vm.runInNewContext(app.slice(start,end)+
 "\nthis.normalize=v7NormalizeIce;this.geometry=v7IceGeometry;this.wear=v728DrawIceWear;this.environment=v728DrawEnvironment;this.appearance=v728Appearance;",
 ctx,{timeout:2500});

const legacy=ctx.normalize({profile:"nhl"});
assert.equal(legacy.appearance.wear,0,"Existing saved plays must retain pristine ice");
assert.equal(legacy.appearance.markingsOpacity,100,"Old markings must remain fully opaque");
assert.equal(legacy.appearance.environment,"standard","Previous default background must be unchanged");
for(const preset of ["standard","forest","mountains","arena","barn","duck"]){
 const changed=ctx.normalize({profile:"iihf",appearance:{wear:73,markingsOpacity:42,environment:preset}});
 assert.equal(changed.appearance.wear,73);
 assert.equal(changed.appearance.markingsOpacity,42);
 assert.equal(changed.appearance.environment,preset);
 assert.equal(ctx.geometry(changed).width,ctx.geometry(ctx.normalize({profile:"iihf"})).width,
   "Appearance must not change rink geometry");
 const base=node("g");
 ctx.environment(base,changed,ctx.geometry(changed),false);
 assert.equal(base.children.length>0,preset!=="standard",preset+" background must be optional");
 const outer=node("g");
 ctx.environment(outer,changed,ctx.geometry(changed),true);
 assert.equal(outer.children.length>0,preset!=="standard",preset+" foreground must be optional")
}
const invalid=ctx.normalize({profile:"nhl",appearance:{wear:999,markingsOpacity:-7,environment:"unknown",lightColor:"not-color"}});
assert.equal(invalid.appearance.wear,100);
assert.equal(invalid.appearance.markingsOpacity,0);
assert.equal(invalid.appearance.environment,"standard");
assert.equal(invalid.appearance.lightColor,"#ffffff");
const ice=ctx.normalize({profile:"nhl"}),g=ctx.geometry(ice);
const fresh=node("g");
ctx.wear(fresh,ice,g);
assert.equal(fresh.children.length,0,"Zero skate wear must draw no scratches or snow");
const light=node("g");
ctx.wear(light,ctx.normalize({appearance:{wear:25}}),g);
const heavy=node("g");
ctx.wear(heavy,ctx.normalize({appearance:{wear:100}}),g);
assert.ok(light.children.length===1&&heavy.children.length===1,"Wear needs one independently clipped layer");
assert.ok(heavy.children[0].children.length>light.children[0].children.length*2,
  "Slider must change scratch density, not just one texture's opacity");
assert.equal(heavy.children[0].attributes["clip-path"],"url(#fullClip)");
const renderer=app.slice(app.indexOf("function v7IceDraw(){"),app.indexOf("let v7IceRenderKey=",app.indexOf("function v7IceDraw(){")));
const ordering=["v728DrawEnvironment(surface,ice,g,false)","surface.append(edge)","v728DrawIceWear(surface,ice,g)",
  "v728DrawLighting(surface,ice,g)","const markings=v7IceSvg","surface.append(markings)","v728DrawEnvironment(surface,ice,g,true)"];
let last=-1;
for(const part of ordering){const at=renderer.indexOf(part);assert.ok(at>last,"Incorrect layer ordering: "+part);last=at}
assert.ok(renderer.includes("markingsOpacity/100"),"Markings must support 0-100% alpha");
assert.ok(renderer.includes("if(centerLogo)surface.append(centerLogo)"),"Center logo should remain independently visible");
for(const part of ['id="v728Wear"','id="v728Markings"','id="v728SceneList"',
  'v7IceSetField("appearance."+field,event.target.value)',
  'v7IceSetField("appearance.environment",card.dataset.v728Scene)',
  'state.ice=v7NormalizeIce({profile:value,appearance:ice.appearance});']){
 assert.ok(app.includes(part),"Missing editable persisted ice control: "+part)
}
assert.ok(app.includes('scenic?"-120 -120 1240 840"'),
  "Environment must have a scalable full-rink camera margin");
console.log("V7.1.29 ice layers: normalization, deterministic wear, opacity, scene presets and compatibility passed.");
