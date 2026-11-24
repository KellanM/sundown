/* gl/batch.js: Sundown's instanced-quad batcher (phase 1 prototype; not loaded by the game yet). Design: research/sundown-craft/webgl-batch.md.
   Test page: gltest.html (pixel diff against Canvas2D, draw calls, frame time).

   What it is. The engine-sized cousin of Unreal's hierarchical instanced static meshes plus material instances: every draw is one instance
   of a unit quad; each instance carries its rect, two colours, a material id and two vec4s of material parameters; a single "uber" shader
   holds the parent materials, so hundreds of differently coloured reflection columns are one draw call.

   Two back ends behind one API (same calls, same pixels):
   - GLBatch.create(canvas, opts): WebGL2, or WebGL1 + ANGLE_instanced_arrays (+ EXT_blend_minmax for 'lighten'). Instances are buffered and
     drawn at flush(), grouped into runs of equal blend mode, in painter's order (stages first, then submission order).
   - GLBatch.create2D(ctx): draws at once with fillRect / drawImage, as roadmat does today. It is the diff reference, and the fallback when a
     device has no WebGL or the context is lost.

   Coordinates. begin(w, h, px): w x h is the backing size in device pixels (the game's canvas is W/PX x H/PX); API positions are CSS px and
   become device pixels by Math.round(v / px), as roadmat's Math.round(x / PX) * PX does. Material shape values (widths, rows, steps, dashes)
   are in device pixels / rows, the game's "rows". Fractional edges are never anti-aliased: the grid is whole device pixels.

   Materials (the parent materials; a "material instance" is just the per-instance colours and params):
   0 FLAT    col
   1 SPRITE  atlas texel (nearest; p0 = sx, sy, sw, sh in atlas texels; p1.xy = float32 sw/dw, sh/dh, multiplied as Skia does, so texel-edge
             ties fall the same way), x tint col (white = none; the 2D back end ignores tint)
   2 COLUMN  a light's reflection: a fringe in col and a core in col2, from the top row down; intensity steps 1, .72, .48, .26 every S rows;
             widening by 2*widen px per step; broken into world-anchored dashes of D rows (a dash is a gap when hash(dash, seed) < breakT/289)
             and jittered sideways by up to J px per dash
   3 STREAK  a slanted rain streak: one tw-px-wide pixel run per row, dx/dy = num/den, the head (bottom) brightest, stepping down every S rows

   Blend modes (pipeline state; a change of mode ends a draw run):
   'source-over' (ONE, ONE_MINUS_SRC_ALPHA, premultiplied), 'lighter' (ONE, ONE), 'lighten' (MAX), 'screen' (ONE, ONE_MINUS_SRC_COLOR),
   'add' (ONE, ONE on colour, alpha kept: for a separate transparent layer composited over the 2D canvas; see the design note).
   'lighten' equals Canvas2D's only where the source alpha is 1 (Canvas: dst + a*max(0, src - dst); MAX: max(dst, a*src)).

   Clipping. clip(x, y, w, h) is carried per instance and applied in the vertex shader (the quad is cut to the clip), so a new clip never ends a
   draw run: roadmat's per-segment row clips cost nothing. clipDev(x0, y0, x1, y1) takes device pixels (rows) directly.

   Stages. stage(i) (0..7) tags what follows; flush draws stage 0 first, then 1, ... each in submission order. Legal whenever instances of
   different stages that overlap are already in stage order. Roadmat's segments clip to disjoint row bands, so "all segments' materials, then
   all pools, then all dark breaks, then all late pools" is the same picture as per-segment order, in 4 draws instead of 4 per segment.

   Allocation. Instance data lives in preallocated typed arrays that double when exceeded; nothing is allocated per frame (WebGL1 makes one
   subarray view when the instance count changes). Colours are packed RGBA uint32s (GLBatch.rgba / GLBatch.hex, cached).

   Software WebGL (SwiftShader and kin) makes ok false with a reason, unless opts.allowSoftware: the 2D back end is faster there.

   Context loss. 'webglcontextlost' is prevented and ok turns false (begin() then returns false: draw this frame with the 2D back end);
   'webglcontextrestored' rebuilds the programs and buffers and re-uploads the atlas. */
(function(root){
'use strict';
const FS = 20, BS = FS * 4;   // floats / bytes per instance
const BLEND = { 'source-over':0, normal:0, lighter:1, lighten:2, screen:3, add:4 };
const LVL = [1, .72, .48, .26];

// ---------------------------------------------------------------- shared math (the 2D back end and the shader agree to the bit)
const md = (x, y) => ((x % y) + y) % y;
const perm = x => ((34 * x + 1) * x) % 289;
const hash = (g, s) => perm(md(perm(md(g, 289)) + s, 289));   // 0..288, integers only (exact in float32 too)
const rgba = (r, g, b, a) => ((r & 255) | ((g & 255) << 8) | ((b & 255) << 16) | (((a === undefined ? 255 : a) & 255) << 24)) >>> 0;
const HEX = new Map();
function hex(s){ let v = HEX.get(s); if(v === undefined){ const n = parseInt(s.slice(1), 16); v = s.length > 7 ? rgba(n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255) : rgba(n >> 16, (n >> 8) & 255, n & 255, 255); HEX.set(s, v); } return v; }
const withA = (c, a) => ((c & 0xffffff) | ((a & 255) << 24)) >>> 0;
const streakX = (j, num, den) => Math.floor((2 * j * num + den) / (2 * den));   // the streak's offset on row j: round(j * num / den), half up

// ---------------------------------------------------------------- shaders (GLSL ES 1.00: runs on WebGL1 and WebGL2)
const VS = `precision highp float;
attribute vec2 a_corner; attribute vec4 a_rect, a_col, a_col2, a_misc, a_clip, a_p0, a_p1;
uniform vec2 u_res;
varying vec4 v_rect, v_col, v_col2, v_misc, v_p0, v_p1;
void main(){
  vec2 r0 = a_rect.xy, r1 = a_rect.xy + a_rect.zw, c0 = max(r0, a_clip.xy), c1 = max(min(r1, a_clip.zw), c0);
  vec2 p = mix(c0, c1, a_corner);
  v_rect = a_rect; v_col = a_col; v_col2 = a_col2; v_misc = a_misc; v_p0 = a_p0; v_p1 = a_p1;
  gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0);
}`;
const FSH = `precision highp float;
uniform sampler2D u_tex; uniform vec2 u_texSize, u_res; uniform float u_blend;
varying vec4 v_rect, v_col, v_col2, v_misc, v_p0, v_p1;
float md(float x, float y){ return x - y * floor((x + 0.5) / y); }
float perm(float x){ return md((34.0 * x + 1.0) * x, 289.0); }
float hsh(float g, float s){ return perm(md(perm(md(g, 289.0)) + s, 289.0)); }
float lvl(float k){ return k < 0.5 ? 1.0 : k < 1.5 ? 0.72 : k < 2.5 ? 0.48 : 0.26; }
vec4 comb(vec4 f, vec4 c){   // a fringe then a core over it, folded into one premultiplied output for this pass's blend
  if(u_blend < 0.5) return c + (1.0 - c.a) * f;
  if(u_blend < 1.5 || u_blend > 3.5) return c + f;
  if(u_blend < 2.5) return max(c, f);
  return c + f - c * f; }
void main(){
  float px = floor(gl_FragCoord.x), py = floor(u_res.y - gl_FragCoord.y);
  vec4 R = floor(v_rect + 0.5); float lx = px - R.x, ly = py - R.y, mat = floor(v_misc.x + 0.5), A = v_misc.z;
  vec4 P = floor(v_p0 + 0.5), Q = floor(v_p1 + 0.5), o;
  if(mat < 0.5){ o = vec4(v_col.rgb * v_col.a, v_col.a) * A; }
  else if(mat < 1.5){ vec2 t = vec2(P.x + floor((lx + 0.5) * v_p1.x), P.y + floor((ly + 0.5) * v_p1.y));   // (v_p1.xy: the float32 ratios Skia's nearest sampling multiplies by)
    vec4 s = texture2D(u_tex, (t + 0.5) / u_texSize); o = vec4(s.rgb * v_col.rgb, s.a) * (v_col.a * A); }
  else if(mat < 2.5){ float J = floor(v_misc.y + 0.5), sd = floor(v_misc.w + 0.5);
    float k = min(floor((ly + 0.5) / Q.x), 3.0), g = floor((ly + Q.w + 0.5) / Q.y);
    if(hsh(g, sd) < Q.z) discard;
    float ox = md(hsh(g, sd + 101.0), 2.0 * J + 1.0) - J, dx = px - P.x - ox, fw = P.y + 2.0 * k * P.w, cw = P.z + 2.0 * k * P.w;
    float fl = -floor(fw * 0.5), cl = -floor(cw * 0.5);
    bool inF = dx >= fl && dx < fl + fw, inC = cw > 0.5 && dx >= cl && dx < cl + cw;
    if(!inF && !inC) discard;
    float I = lvl(k) * A;
    vec4 f = inF ? vec4(v_col.rgb * v_col.a, v_col.a) * I : vec4(0.0), c = inC ? vec4(v_col2.rgb * v_col2.a, v_col2.a) * I : vec4(0.0);
    o = comb(f, c); if(o.a <= 0.0 && dot(o.rgb, vec3(1.0)) <= 0.0) discard; }
  else { float xs = P.x + floor((2.0 * ly * P.y + P.z + 0.5) / (2.0 * P.z));
    if(px < xs || px >= xs + P.w) discard;
    float k = min(floor((R.w - 1.0 - ly + 0.5) / Q.x), 3.0);
    o = vec4(v_col.rgb * v_col.a, v_col.a) * (lvl(k) * A); }
  gl_FragColor = o;
}`;

// ---------------------------------------------------------------- the WebGL back end
function create(canvas, opts){
  opts = opts || {};
  const B = { ok:false, kind:'', reason:'', caps:{ lighten:true, webgl2:false }, stats:{ draws:0, instances:0, bytes:0, lost:0, restored:0 } };
  let gl = null, LC = null, ins = null, prog = null, vbo = null, ibo = null, tex = null, atlas = null, texW = 1, texH = 1, L = null, U = {};
  let cap = 0, A = null, AU = null, AS = null, STG = null, BLD = null, A2U = null, BLD2 = null, glCap = 0, view1 = null, view1n = -1;
  let n = 0, W = 1, H = 1, PXu = 1, cx0 = 0, cy0 = 0, cx1 = 0, cy1 = 0, blend = 0, stage = 0, smask = 0, alpha = 1, inFrame = false;
  const CA = { alpha:true, premultipliedAlpha:true, antialias:false, depth:false, stencil:false, preserveDrawingBuffer:!!opts.preserve, powerPreference:'high-performance' };

  function grow(need){ let c = cap || 1024; while(c < need) c *= 2; if(c === cap) return;
    const nA = new ArrayBuffer(c * BS), nU = new Uint32Array(nA); if(AU) nU.set(AU.subarray(0, n * FS));
    A = new Float32Array(nA); AU = nU; AS = new Int16Array(nA);
    const nS = new Uint8Array(c), nB = new Uint8Array(c); if(STG){ nS.set(STG.subarray(0, n)); nB.set(BLD.subarray(0, n)); } STG = nS; BLD = nB;
    A2U = new Uint32Array(c * FS); BLD2 = new Uint8Array(c); cap = c; view1n = -1; }
  grow(opts.capacity || 4096);

  function sh(type, src){ const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error('GLBatch shader: ' + gl.getShaderInfoLog(s)); return s; }
  function init(){
    gl = null; ins = null;
    if(!opts.webgl1) gl = canvas.getContext('webgl2', CA);
    if(gl){ B.kind = 'webgl2'; B.caps.webgl2 = true; B.caps.lighten = true;
      ins = { div:(i, d) => gl.vertexAttribDivisor(i, d), draw:(c) => gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, c), MAX:gl.MAX }; }
    else { gl = canvas.getContext('webgl', CA) || canvas.getContext('experimental-webgl', CA); if(!gl){ B.ok = false; B.reason = 'no WebGL'; return false; }
      const e = gl.getExtension('ANGLE_instanced_arrays'); if(!e){ B.ok = false; B.reason = 'WebGL1 without ANGLE_instanced_arrays'; return false; }
      const mm = gl.getExtension('EXT_blend_minmax'); B.kind = 'webgl1'; B.caps.webgl2 = false; B.caps.lighten = !!mm;
      ins = { div:(i, d) => e.vertexAttribDivisorANGLE(i, d), draw:(c) => e.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, c), MAX:mm ? mm.MAX_EXT : 0 }; }
    if(gl.isContextLost()){ B.ok = false; B.reason = 'context lost'; return false; }
    // software WebGL (SwiftShader, llvmpipe, WARP) is far slower than Canvas2D at this (measured: 100 ms vs 17 ms a frame): refuse unless asked
    { const e = gl.getExtension('WEBGL_debug_renderer_info'), rn = String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      B.caps.software = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(rn); B.caps.renderer = rn;
      if(B.caps.software && !opts.allowSoftware){ B.ok = false; B.reason = 'software WebGL: ' + rn; return false; } }
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FSH)); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ B.ok = false; B.reason = 'link: ' + gl.getProgramInfoLog(prog); return false; }
    gl.useProgram(prog);
    L = {}; for(const a of ['a_corner', 'a_rect', 'a_col', 'a_col2', 'a_misc', 'a_clip', 'a_p0', 'a_p1']) L[a] = gl.getAttribLocation(prog, a);
    U = {}; for(const u of ['u_res', 'u_tex', 'u_texSize', 'u_blend']) U[u] = gl.getUniformLocation(prog, u);
    vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(L.a_corner); gl.vertexAttribPointer(L.a_corner, 2, gl.FLOAT, false, 0, 0); ins.div(L.a_corner, 0);
    ibo = gl.createBuffer(); glCap = 0;
    for(const a of ['a_rect', 'a_col', 'a_col2', 'a_misc', 'a_clip', 'a_p0', 'a_p1']){ gl.enableVertexAttribArray(L[a]); ins.div(L[a], 1); }
    tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); texW = texH = 1;
    if(atlas) upload(atlas);
    gl.uniform1i(U.u_tex, 0); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.DITHER); gl.disable(gl.SCISSOR_TEST); gl.enable(gl.BLEND);
    if(!LC) LC = gl.getExtension('WEBGL_lose_context');   // (kept: a lost context answers getExtension with null)
    view1n = -1; B.ok = true; B.reason = ''; B.gl = gl; return true; }
  /* The atlas is premultiplied here, as Skia stores a canvas (round(c * a / 255)), and uploaded as is. (UNPACK_PREMULTIPLY_ALPHA_WEBGL from a
     canvas rounded differently: +-1-2 on half-transparent texels.) Unpremultiplied canvas data premultiplies back to the stored bytes exactly. */
  function atlasBytes(src){ let id = null;
    if(typeof ImageData !== 'undefined' && src instanceof ImageData) id = src;
    else { let k = src.getContext ? src.getContext('2d') : null; if(!k){ const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; k = c.getContext('2d'); k.drawImage(src, 0, 0); } id = k.getImageData(0, 0, src.width, src.height); }
    const d = id.data, o = new Uint8Array(d.length);
    for(let i = 0; i < d.length; i += 4){ const a = d[i + 3]; o[i] = Math.round(d[i] * a / 255); o[i + 1] = Math.round(d[i + 1] * a / 255); o[i + 2] = Math.round(d[i + 2] * a / 255); o[i + 3] = a; }
    return { w:id.width, h:id.height, o }; }
  let atlasB = null;
  function upload(src){ if(!atlasB || atlasB.src !== src){ atlasB = atlasBytes(src); atlasB.src = src; }
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlasB.w, atlasB.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlasB.o); texW = atlasB.w; texH = atlasB.h; }

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); B.ok = false; B.reason = 'context lost'; B.stats.lost++; inFrame = false; n = 0; if(B.onLost) B.onLost(); });
  canvas.addEventListener('webglcontextrestored', () => { try{ init(); B.stats.restored++; }catch(err){ B.ok = false; B.reason = String(err && err.message || err); } if(B.onRestored) B.onRestored(B.ok); });
  try{ init(); }catch(err){ B.ok = false; B.reason = String(err && err.message || err); }

  function setBlend(m){ if(m === 0){ gl.blendEquation(gl.FUNC_ADD); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
    else if(m === 1){ gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE); }
    else if(m === 2){ if(ins.MAX){ gl.blendEquation(ins.MAX); gl.blendFunc(gl.ONE, gl.ONE); } else { gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE); } }
    else if(m === 3){ gl.blendEquation(gl.FUNC_ADD); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
    else { gl.blendEquation(gl.FUNC_ADD); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); }
    gl.uniform1f(U.u_blend, m); }
  function point(off){ gl.vertexAttribPointer(L.a_rect, 4, gl.FLOAT, false, BS, off); gl.vertexAttribPointer(L.a_col, 4, gl.UNSIGNED_BYTE, true, BS, off + 16);
    gl.vertexAttribPointer(L.a_col2, 4, gl.UNSIGNED_BYTE, true, BS, off + 20); gl.vertexAttribPointer(L.a_misc, 4, gl.FLOAT, false, BS, off + 24);
    gl.vertexAttribPointer(L.a_clip, 4, gl.SHORT, false, BS, off + 40); gl.vertexAttribPointer(L.a_p0, 4, gl.FLOAT, false, BS, off + 48); gl.vertexAttribPointer(L.a_p1, 4, gl.FLOAT, false, BS, off + 64); }

  // one instance (device pixels); cut against the clip here too, so off-clip instances never reach the GPU
  function push(mat, x, y, w, h, col, col2, J, seed, a, b, c, d, e, f, g, hh){
    if(w <= 0 || h <= 0 || x >= cx1 || y >= cy1 || x + w <= cx0 || y + h <= cy0 || alpha <= 0) return;
    if(n >= cap) grow(n + 1);
    const o = n * FS; A[o] = x; A[o + 1] = y; A[o + 2] = w; A[o + 3] = h; AU[o + 4] = col; AU[o + 5] = col2;
    A[o + 6] = mat; A[o + 7] = J; A[o + 8] = alpha; A[o + 9] = seed; const s = (o + 10) * 2; AS[s] = cx0; AS[s + 1] = cy0; AS[s + 2] = cx1; AS[s + 3] = cy1;
    A[o + 12] = a; A[o + 13] = b; A[o + 14] = c; A[o + 15] = d; A[o + 16] = e; A[o + 17] = f; A[o + 18] = g; A[o + 19] = hh;
    STG[n] = stage; BLD[n] = blend; smask |= 1 << stage; n++; }
  const R = v => Math.round(v / PXu);

  B.begin = function(w, h, px){ if(!B.ok) return false; W = w | 0; H = h | 0; PXu = px || 1;
    if(canvas.width !== W) canvas.width = W; if(canvas.height !== H) canvas.height = H;
    n = 0; smask = 0; stage = 0; blend = 0; alpha = 1; cx0 = 0; cy0 = 0; cx1 = W; cy1 = H; inFrame = true; return true; };
  // the clear waits for flush: a frame with no instances makes no GL call at all (and clears only if the last flush left pixels: held)
  let held = true; const clr = () => { gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); held = false; };
  B.blend = function(m){ const v = BLEND[m]; blend = v === undefined ? 0 : v; };
  B.stage = function(i){ stage = Math.max(0, Math.min(7, i | 0)); };
  B.alpha = function(a){ alpha = a > 1 ? 1 : a; };
  B.clip = function(x, y, w, h){ cx0 = Math.max(0, R(x)); cy0 = Math.max(0, R(y)); cx1 = Math.min(W, R(x + w)); cy1 = Math.min(H, R(y + h)); };
  B.clipDev = function(x0, y0, x1, y1){ cx0 = Math.max(0, x0 | 0); cy0 = Math.max(0, y0 | 0); cx1 = Math.min(W, x1 | 0); cy1 = Math.min(H, y1 | 0); };
  B.noClip = function(){ cx0 = 0; cy0 = 0; cx1 = W; cy1 = H; };
  B.fill = function(x, y, w, h, col){ const x0 = R(x), y0 = R(y); push(0, x0, y0, R(x + w) - x0, R(y + h) - y0, col, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); };
  B.sprite = function(sx, sy, sw, sh, x, y, w, h, tint){ const x0 = R(x), y0 = R(y), dw = R(x + w) - x0, dh = R(y + h) - y0; if(dw <= 0 || dh <= 0) return;
    push(1, x0, y0, dw, dh, tint === undefined ? 0xffffffff : tint, 0, 0, 0, sx, sy, sw, sh, Math.fround(sw / dw), Math.fround(sh / dh), 0, 0); };
  // a reflection column: centre cx, top y, length len (CSS px); fringeW, coreW, widen, J in device px; S, D, anchor in device rows; breakP 0..1
  /* Exact mode (default) lays a column as two instances, its fringe then its core, as Canvas2D blends twice; fuse (opts.fuseColumns) folds both
     into one quad and one blend: half the instances, but each covered pixel then rounds once instead of twice (a channel can differ by 1-2). */
  const FUSE = !!opts.fuseColumns;
  B.column = function(cx, y, len, fringeW, coreW, widen, S, D, breakP, anchor, seed, J, col, col2){ const c = R(cx), y0 = R(y), h = R(y + len) - y0; S = Math.max(1, S); D = Math.max(1, D); seed %= 289; const bt = Math.round(breakP * 289);
    if(FUSE){ const mw = Math.max(fringeW, coreW) + 6 * widen; push(2, c - (mw >> 1) - J - 1, y0, mw + 2 * J + 2, h, col, col2, J, seed, c, fringeW, coreW, widen, S, D, bt, anchor); return; }
    if(fringeW + 6 * widen > 0 && (col >>> 24)){ const mw = fringeW + 6 * widen; push(2, c - (mw >> 1) - J - 1, y0, mw + 2 * J + 2, h, col, 0, J, seed, c, fringeW, 0, widen, S, D, bt, anchor); }
    if(coreW + 6 * widen > 0 && (col2 >>> 24)){ const mw = coreW + 6 * widen; push(2, c - (mw >> 1) - J - 1, y0, mw + 2 * J + 2, h, 0, col2, J, seed, c, 0, coreW, widen, S, D, bt, anchor); } };
  // a rain streak: top-left x, top y, len (CSS px); slant num/den (device px across per row); tw px wide; S rows per brightness step
  B.streak = function(x, y, len, num, den, tw, S, col){ const x0 = R(x), y0 = R(y), h = R(y + len) - y0; if(h <= 0) return; den = Math.max(1, den); const e = streakX(h - 1, num, den);
    push(3, x0 + Math.min(0, e), y0, Math.abs(e) + tw, h, col, 0, 0, 0, x0, num, den, tw, Math.max(1, S), 0, 0, 0); };
  B.setAtlas = function(src){ atlas = src; atlasB = null; if(B.ok) upload(src); };   // (a changed atlas: call again; the bytes are kept for a context restore)

  B.flush = function(){ const st = B.stats; st.draws = 0; st.instances = n; st.bytes = 0; if(!B.ok || !inFrame){ n = 0; inFrame = false; return st; } inFrame = false; if(!n){ if(held) clr(); return st; } clr(); held = true;
    let SU = AU, SB = BLD;
    if(smask & (smask - 1)){   // more than one stage: a stable counting sort by stage (copied as uint32s, so packed bytes are never touched as floats)
      let j = 0; for(let sg = 0; sg < 8; sg++){ if(!(smask & (1 << sg))) continue; for(let i = 0; i < n; i++){ if(STG[i] !== sg) continue; const a = i * FS, b = j * FS; for(let q = 0; q < FS; q++) A2U[b + q] = AU[a + q]; BLD2[j++] = BLD[i]; } }
      SU = A2U; SB = BLD2; }
    gl.useProgram(prog); gl.bindBuffer(gl.ARRAY_BUFFER, ibo);
    if(glCap < n){ glCap = cap; gl.bufferData(gl.ARRAY_BUFFER, glCap * BS, gl.DYNAMIC_DRAW); }
    if(B.caps.webgl2) gl.bufferSubData(gl.ARRAY_BUFFER, 0, SU, 0, n * FS);
    else { if(view1n !== n || view1 === null || view1.buffer !== SU.buffer){ view1 = SU.subarray(0, n * FS); view1n = n; } gl.bufferSubData(gl.ARRAY_BUFFER, 0, view1); }
    st.bytes = n * BS;
    gl.uniform2f(U.u_res, W, H); gl.uniform2f(U.u_texSize, texW, texH); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    let i = 0, cur = -1; while(i < n){ const m = SB[i]; let j = i + 1; while(j < n && SB[j] === m) j++;
      if(m !== cur){ setBlend(m); cur = m; } point(i * BS); ins.draw(j - i); st.draws++; i = j; }
    n = 0; return st; };
  B.lose = function(){ if(LC) LC.loseContext(); return !!LC; };   // (tests only)
  B.restore = function(){ if(LC) LC.restoreContext(); return !!LC; };
  B.renderer = function(){ if(!gl) return ''; const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); };
  B.canvas = canvas;
  return B; }

// ---------------------------------------------------------------- the Canvas2D back end (the reference, and the no-WebGL fallback)
function create2D(ctx, opts){
  opts = opts || {}; const SPLIT = !!opts.rowSplit;   // rowSplit (tests only): every rect as 1-row rects; the same pixels by the math, a different Skia batching
  const B = { ok:true, kind:'canvas2d', caps:{ lighten:true }, stats:{ draws:0, calls:0, state:0, instances:0 } };
  const OPS = ['source-over', 'lighter', 'lighten', 'screen', 'lighter'], CSS = new Map();
  let W = 1, H = 1, PXu = 1, blend = 0, alpha = 1, atlas = null, cx0 = 0, cy0 = 0, cx1 = 0, cy1 = 0, clipOn = false, clipDirty = false;
  let gOp = -1, gA = -1, gC = -1;
  const RM = 1024, RS = new Int32Array(RM), RE = new Int32Array(RM), RK = new Int8Array(RM), RX = new Int32Array(RM);
  const css = c => { let s = CSS.get(c); if(s === undefined){ s = `rgb(${c & 255},${(c >>> 8) & 255},${(c >>> 16) & 255})`; CSS.set(c, s); } return s; };
  const R = v => Math.round(v / PXu);
  function sync(){ const st = B.stats;
    if(clipDirty){ ctx.restore(); ctx.save(); gOp = gA = gC = -1; if(clipOn){ ctx.beginPath(); ctx.rect(cx0 * PXu, cy0 * PXu, (cx1 - cx0) * PXu, (cy1 - cy0) * PXu); ctx.clip(); } clipDirty = false; st.state++; }
    if(gOp !== blend){ ctx.globalCompositeOperation = OPS[blend]; gOp = blend; st.state++; } }
  function sA(a){ if(a !== gA){ ctx.globalAlpha = a; gA = a; B.stats.state++; } }
  function sC(c){ if(c !== gC){ ctx.fillStyle = css(c); gC = c; B.stats.state++; } }
  function rect(x, y, w, h){ if(SPLIT && h > 1){ for(let q = 0; q < h; q++) rect(x, y + q, w, 1); return; } ctx.fillRect(x * PXu, y * PXu, w * PXu, h * PXu); B.stats.calls++; }
  B.begin = function(w, h, px){ W = w | 0; H = h | 0; PXu = px || 1; blend = 0; alpha = 1; cx0 = 0; cy0 = 0; cx1 = W; cy1 = H; clipOn = false; clipDirty = false;
    const st = B.stats; st.calls = 0; st.state = 0; st.instances = 0; ctx.save(); ctx.save(); gOp = gA = gC = -1; return true; };
  B.blend = function(m){ const v = BLEND[m]; blend = v === undefined ? 0 : v; };
  B.stage = function(){};   // immediate mode: submission order is painter's order
  B.alpha = function(a){ alpha = a > 1 ? 1 : a; };
  function setClip(x0, y0, x1, y1){ x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1); if(x0 === cx0 && y0 === cy0 && x1 === cx1 && y1 === cy1) return;
    cx0 = x0; cy0 = y0; cx1 = x1; cy1 = y1; clipOn = !(x0 === 0 && y0 === 0 && x1 === W && y1 === H); clipDirty = true; }
  B.clip = function(x, y, w, h){ setClip(R(x), R(y), R(x + w), R(y + h)); };
  B.clipDev = function(x0, y0, x1, y1){ setClip(x0 | 0, y0 | 0, x1 | 0, y1 | 0); };
  B.noClip = function(){ setClip(0, 0, W, H); };
  const vis = (x, y, w, h) => !(w <= 0 || h <= 0 || x >= cx1 || y >= cy1 || x + w <= cx0 || y + h <= cy0 || alpha <= 0);
  B.fill = function(x, y, w, h, col){ const x0 = R(x), y0 = R(y), ww = R(x + w) - x0, hh = R(y + h) - y0; if(!vis(x0, y0, ww, hh)) return; B.stats.instances++; sync(); sC(col); sA(alpha * ((col >>> 24) / 255)); rect(x0, y0, ww, hh); };
  B.sprite = function(sx, sy, sw, sh, x, y, w, h){ const x0 = R(x), y0 = R(y), ww = R(x + w) - x0, hh = R(y + h) - y0; if(!atlas || !vis(x0, y0, ww, hh)) return; B.stats.instances++; sync(); sA(alpha);
    ctx.drawImage(atlas, sx, sy, sw, sh, x0 * PXu, y0 * PXu, ww * PXu, hh * PXu); B.stats.calls++; };
  B.column = function(cx, y, len, fringeW, coreW, widen, S, D, breakP, anchor, seed, J, col, col2){ const c = R(cx), y0 = R(y), h = R(y + len) - y0, mw = Math.max(fringeW, coreW) + 6 * widen;
    if(!vis(c - (mw >> 1) - J - 1, y0, mw + 2 * J + 2, h)) return; B.stats.instances++; S = Math.max(1, S); D = Math.max(1, D); seed %= 289; const bt = Math.round(breakP * 289);
    // the rows (cut to the clip, as roadmat walks only its segment's rows), grouped into runs of equal step, dash and jitter
    const la = Math.max(0, cy0 - y0), lb = Math.min(h, cy1 - y0); let nr = 0, pk = -2, px = 0, pg = 0;
    for(let ly = la; ly < lb; ly++){ const g = Math.floor((ly + anchor) / D), k = Math.min(Math.floor(ly / S), 3);
      const gap = hash(g, seed) < bt, ox = gap ? 0 : md(hash(g, seed + 101), 2 * J + 1) - J, kk = gap ? -1 : k;
      if(kk !== pk || ox !== px || g !== pg){ if(nr < RM){ RS[nr] = ly; RK[nr] = kk; RX[nr] = ox; nr++; } pk = kk; px = ox; pg = g; } if(nr) RE[nr - 1] = ly + 1; }
    if(!nr) return; sync();
    // two passes per column, as roadmat's hotPool: every fringe in the colour, then every core
    const fa = alpha * ((col >>> 24) / 255), ca = alpha * ((col2 >>> 24) / 255);
    if(fa > 0){ sC(col); for(let q = 0; q < nr; q++){ const k = RK[q]; if(k < 0) continue; const fw = fringeW + 2 * k * widen; if(fw <= 0) continue; sA(fa * LVL[k]); rect(c + RX[q] - (fw >> 1), y0 + RS[q], fw, RE[q] - RS[q]); } }
    if(ca > 0){ sC(col2); for(let q = 0; q < nr; q++){ const k = RK[q]; if(k < 0) continue; const cw = coreW + 2 * k * widen; if(cw <= 0) continue; sA(ca * LVL[k]); rect(c + RX[q] - (cw >> 1), y0 + RS[q], cw, RE[q] - RS[q]); } } };
  B.streak = function(x, y, len, num, den, tw, S, col){ const x0 = R(x), y0 = R(y), h = R(y + len) - y0; if(h <= 0) return; den = Math.max(1, den); S = Math.max(1, S); const e = streakX(h - 1, num, den);
    if(!vis(x0 + Math.min(0, e), y0, Math.abs(e) + tw, h)) return; B.stats.instances++; sync(); sC(col); const a0 = alpha * ((col >>> 24) / 255);
    const la = Math.max(0, cy0 - y0), lb = Math.min(h, cy1 - y0); let rs = -1, rx = 0, rk = -1;
    for(let ly = la; ly <= lb; ly++){ const xs = ly < lb ? x0 + streakX(ly, num, den) : 0, k = ly < lb ? Math.min(Math.floor((h - 1 - ly) / S), 3) : -9;
      if(ly === lb || xs !== rx || k !== rk){ if(rs >= 0){ sA(a0 * LVL[rk]); rect(rx, y0 + rs, tw, ly - rs); } rs = ly; rx = xs; rk = k; } } };
  B.setAtlas = function(src){ atlas = src; };
  B.flush = function(){ ctx.restore(); ctx.restore(); B.stats.draws = B.stats.calls; return B.stats; };
  return B; }

root.GLBatch = { create, create2D, rgba, hex, withA, hash, BLEND, LVL };
})(typeof window !== 'undefined' ? window : globalThis);
