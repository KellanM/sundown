/* Sundown mechanic module: breakfx. A small shared "it broke" effect for soft props you ride through (cones, roadworks barricades,
   checkpoint sawhorses, boards, banners): the prop's own cached sprite splits into tiles that fly apart in world space, tumble in
   quarter turns (pixel art never rotates by odd angles), bounce once on the road and settle out, with a crack sound and, if
   mech/style.js is loaded, a small style act.
   API: MECH.breakfx.hit({ spr, z, x, r, n, h, kind, pts, vol, burst })
     spr   the prop's cached sprite canvas (never a new one: tiles are source rects of it)
     z, x  world z (units) and x (half-road widths) of the prop's foot
     r     the prop's draw scale relative to uw (CSS px per sprite px = r * uw), as its own draw code uses (e.g. cone uw * .0055 -> .0055)
     n     tiles per side (default 2: 4 shards; 3 for a big board)
     h     world height of the prop's foot above the road (default 0)
     kind  style act kind (default 'smash'); pts: style points (default 40; 0 = no act); vol: sound level 0..1 (default 1)
     burst forward speed of the shards relative to the rider (default .75 of speed)
   Shards live in a fixed pool (no allocation a frame), are drawn by drawSeg in their segment's depth order, and fade out as they land.
   Reduced motion: fewer, slower shards and no spin. */
"use strict";
(() => {
  const B = MECH.breakfx = {};
  const N = 48, G = 7200;                       // pool size; gravity (world units / s^2)
  const P = Array.from({ length:N }, () => ({ on:false, spr:null, sx:0, sy:0, sw:0, sh:0, z:0, x:0, h:0, vz:0, vx:0, vh:0, r:0, rot:0, spin:0, t:0, life:0, bounced:false }));
  let live = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function snd(vol){ if(typeof M === 'undefined' || !M.ac) return; const t = M.ac.currentTime, v = Math.max(0, Math.min(1, vol));
    M.noise(.07, 2600, .05 * v, t); M.noise(.16, 700, .045 * v, t + .015); if(M.tone) M.tone(190, .07, { type:'square', v:.012 * v, at:t }); }
  B.hit = o => { if(!o || !o.spr || !o.spr.width) return false; const spr = o.spr, n = Math.max(1, Math.min(4, o.n || 2)), red = typeof reduce !== 'undefined' && reduce;
    const tw = Math.max(1, Math.floor(spr.width / n)), th = Math.max(1, Math.floor(spr.height / n)), sp = typeof speed === 'number' ? speed : 0, fw = o.burst == null ? .75 : o.burst;
    let made = 0;
    for(let j = 0; j < n; j++) for(let i = 0; i < n; i++){ if(red && (i + j) % 2) continue;
      let q = null; for(const p of P) if(!p.on){ q = p; break; } if(!q) break;
      const ox = (i + .5) / n - .5, up = 1 - (j + .5) / n;   // tile centre: -.5..5 across, 0 (foot) .. 1 (top)
      q.on = true; q.spr = spr; q.sx = i * tw; q.sy = j * th; q.sw = tw; q.sh = th;
      q.r = o.r; q.z = o.z + rnd(-20, 40); q.x = o.x + ox * spr.width * o.r; q.h = (o.h || 0) + up * spr.height * o.r * ROADW * W / H;   // (sprite px -> half-road widths, and -> world units)
      q.vz = sp * fw * rnd(.85, 1.15) * (red ? .8 : 1); q.vx = (ox * 2 + rnd(-.6, .6)) * (red ? .5 : 1.4) + (o.x - (typeof playerX === 'number' ? playerX : 0) > 0 ? .6 : -.6) * (red ? .4 : 1);
      q.vh = rnd(1400, 2800) * (.6 + up * .7) * (red ? .6 : 1); q.rot = 0; q.spin = red ? 0 : rnd(4, 9) * (Math.random() < .5 ? -1 : 1); q.t = 0; q.life = rnd(.9, 1.3); q.bounced = false; made++; live++; }
    if(made){ snd(o.vol == null ? 1 : o.vol); const pts = o.pts == null ? 40 : o.pts; if(pts > 0 && MECH.style && MECH.style.act){ try{ MECH.style.act(o.kind || 'smash', pts); }catch(e){} } }
    return made > 0; };
  B.update = dt => { if(!live) return; for(const q of P){ if(!q.on) continue; q.t += dt; q.z += q.vz * dt; q.x += q.vx * dt; q.vh -= G * dt; q.h += q.vh * dt; q.rot += q.spin * dt;
      if(q.h <= 0){ q.h = 0; if(!q.bounced && q.vh < -300){ q.bounced = true; q.vh = -q.vh * .32; q.vz *= .55; q.vx *= .5; q.spin *= .5; } else { q.vh = 0; q.vz *= Math.max(0, 1 - 4 * dt); q.spin = 0; } }
      if(q.t > q.life || (typeof position === 'number' && q.z < position)){ q.on = false; q.spr = null; live--; } } };
  B.drawSeg = (s, sx0, sy0, uw, fog) => { if(!live) return; const i0 = s.index * SEG, i1 = i0 + SEG;
    for(const q of P){ if(!q.on || q.z < i0 || q.z >= i1) continue; const f = (q.z - i0) / SEG, a = s.p1.screen, b = s.p2.screen;
      const sc = a.scale + (b.scale - a.scale) * f, w = a.w + (b.w - a.w) * f, X = a.x + (b.x - a.x) * f + q.x * w, Y = a.y + (b.y - a.y) * f - sc * q.h * H / 2;
      const k = q.r * w, dw = Math.max(PX, snap(q.sw * k)), dh = Math.max(PX, snap(q.sh * k)); if(dw > W * .5) continue;
      const fade = Math.min(1, (q.life - q.t) / .3), qt = ((Math.round(q.rot / (Math.PI / 2)) % 4) + 4) % 4;
      cx.globalAlpha = Math.max(0, fade) * (1 - fog * .6); cx.imageSmoothingEnabled = false;
      if(qt === 0) cx.drawImage(q.spr, q.sx, q.sy, q.sw, q.sh, snap(X - dw / 2), snap(Y - dh), dw, dh);
      else { cx.save(); cx.translate(snap(X), snap(Y - dh / 2)); cx.rotate(qt * Math.PI / 2); cx.drawImage(q.spr, q.sx, q.sy, q.sw, q.sh, -dw / 2, -dh / 2, dw, dh); cx.restore(); } }
    cx.globalAlpha = 1; };
  B.reset = () => { for(const q of P){ q.on = false; q.spr = null; } live = 0; };
  B.live = () => live;
})();
