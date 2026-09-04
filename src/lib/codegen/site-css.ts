/**
 * Self-contained CSS embedded into exported & deployed static sites.
 * Kept in sync with the studio renderer classes in app/globals.css.
 */
export const SITE_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0}
html{-webkit-text-size-adjust:100%}
body{background:#0a0a0c;color:#fafafa;font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.pv-page{min-height:100vh}
.pv-block{position:relative;padding:var(--pad,44px) 24px}
.pv-inner{max-width:var(--maxw,94%);margin:0 auto;text-align:var(--align,left)}
.pv-title{font-family:'Space Grotesk',sans-serif;font-size:var(--fs,30px);font-weight:700;line-height:1.12;letter-spacing:-.02em}
.pv-grad{background:linear-gradient(90deg,var(--acc,#e11d48),#fb7185);-webkit-background-clip:text;background-clip:text;color:transparent}
.pv-sub{color:#9ca3af;margin-top:10px;font-size:calc(var(--fs,30px)*.42);line-height:1.55}
.pv-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;background:none;border:0;font-family:inherit}
.pv-btn-acc{background:linear-gradient(135deg,var(--acc,#e11d48),color-mix(in srgb,var(--acc,#e11d48) 55%,#000));color:#fff;box-shadow:0 6px 20px -4px color-mix(in srgb,var(--acc,#e11d48) 55%,transparent)}
.pv-btn-ghost{border:1px solid rgba(255,255,255,.16);color:#e5e5e5}
.pv-grid{display:grid;gap:var(--gap,14px)}
.pv-cards{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.pv-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;text-align:left}
.pv-card .ico{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--acc,#e11d48) 16%,transparent);color:var(--acc,#e11d48);margin-bottom:10px}
.pv-card h4{font-size:14px;font-weight:600}
.pv-card p{font-size:12px;color:#9ca3af;margin-top:4px;line-height:1.5}
.pv-nav{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.pv-logo{display:flex;gap:8px;align-items:center;font-weight:700;font-family:'Space Grotesk',sans-serif;font-size:15px}
.pv-logo .dot{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,var(--acc,#e11d48),color-mix(in srgb,var(--acc,#e11d48) 40%,#000))}
.pv-links{display:flex;gap:16px;color:#a1a1aa;font-size:13px;flex-wrap:wrap}
.pv-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;border:1px solid color-mix(in srgb,var(--acc,#e11d48) 45%,transparent);color:color-mix(in srgb,var(--acc,#e11d48) 80%,#fff);background:color-mix(in srgb,var(--acc,#e11d48) 10%,transparent);margin-bottom:14px}
.pv-stats{display:flex;gap:26px;margin-top:26px;flex-wrap:wrap}
.pv-stats b{font-family:'Space Grotesk',sans-serif;font-size:18px;display:block}
.pv-stats span{font-size:11px;color:#71717a}
.pv-bg-glass{background:rgba(255,255,255,.03);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.pv-bg-grad{background:radial-gradient(70% 90% at 50% 0%,color-mix(in srgb,var(--acc,#e11d48) 20%,transparent),transparent 70%)}
.pv-img{border-radius:12px;border:1px solid rgba(255,255,255,.08);width:100%;height:110px;object-fit:cover}
.pv-avatar{width:26px;height:26px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--acc,#e11d48),#7f1d1d)}
.pv-foot{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;color:#71717a;font-size:12px;border-top:1px solid rgba(255,255,255,.07);padding-top:18px}
.pv-form input,.pv-form textarea{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 12px;font-size:13px;color:#fafafa;width:100%;font-family:inherit}
.pv-faq details{border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:12px 16px;background:rgba(255,255,255,.03)}
.pv-faq summary{cursor:pointer;font-weight:600;font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;list-style:none}
.pv-faq summary::after{content:"+";color:var(--acc,#e11d48);font-size:18px;line-height:1}
.pv-faq details[open] summary::after{content:"−"}
.pv-faq p{color:#9ca3af;font-size:13px;margin-top:10px;line-height:1.6}
.pv-price{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;margin:8px 0}
.pv-check{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#a1a1aa;margin-top:6px}
.pv-check::before{content:"✓";color:#4ade80;font-weight:700;flex-shrink:0}
.pv-step{display:flex;gap:14px;align-items:flex-start}
.pv-step-num{flex-shrink:0;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'Space Grotesk',sans-serif;background:color-mix(in srgb,var(--acc,#e11d48) 18%,transparent);color:var(--acc,#e11d48);font-size:14px}
.pv-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)}
.pv-ghost-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:110px;border-radius:12px;border:1px dashed rgba(255,255,255,.18);background:linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.01));color:#71717a;font-size:12px;font-weight:600;text-align:center;padding:8px}
.site-hero-cta{display:flex;gap:10px;margin-top:20px;justify-content:var(--align,left);flex-wrap:wrap}
.site-form-grid{display:grid;gap:12px;margin-top:18px;max-width:460px}
@media(max-width:768px){
  .pv-title{font-size:calc(var(--fs,30px)*.8)}
  .pv-stats{gap:16px}
}
`;
