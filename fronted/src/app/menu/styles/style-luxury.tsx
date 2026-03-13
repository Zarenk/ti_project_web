"use client"

import { useState } from "react"
import type { MenuStyleProps, MenuItem, MenuCategory, MenuHours, MenuContact, MenuSocialLinks, MenuPalette } from "../menu-types"
import { getItemImage } from "../menu-helpers"
import {
  FacebookIcon, InstagramIcon, TiktokIcon, WhatsAppIcon,
  MapPinIcon, PhoneIcon, MailIcon, UtensilsIcon, ClockIcon, SearchIcon,
} from "../menu-social-icons"

export function StyleLuxury(props: MenuStyleProps) {
  const {
    categories, filteredMenu, featuredItems,
    hours, contact, socialLinks, palette, search, setSearch,
    activeCategory, setActiveCategory,
    restaurantName, description, logoUrl, bannerUrl, showSearch,
  } = props
  const { isDark, bgColor, textColor, accentColor, mutedText, borderColor, cardBg, surfaceBg, pillActiveBg, pillActiveText, pillBg } = palette

  const goldGlow = `${accentColor}30`
  const ornamentColor = `${accentColor}80`

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      <style>{`
        @keyframes lux-fade-in {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lux-fade { animation: lux-fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .lux-d1 { animation-delay: 0.1s; }
        .lux-d2 { animation-delay: 0.2s; }
        .lux-d3 { animation-delay: 0.3s; }
        .lux-d4 { animation-delay: 0.4s; }
        .lux-d5 { animation-delay: 0.5s; }
        .lux-d6 { animation-delay: 0.6s; }
        .lux-card {
          border: 1px solid ${goldGlow};
          transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.3s ease;
        }
        .lux-card:hover {
          border-color: ${accentColor};
          box-shadow: 0 0 20px ${accentColor}15, inset 0 0 20px ${accentColor}05;
          transform: translateY(-3px);
        }
        .lux-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, ${ornamentColor} 50%, transparent 100%);
        }
        .lux-corner {
          position: absolute; width: 20px; height: 20px;
          border-color: ${accentColor}; opacity: 0.5;
        }
        .lux-corner-tl { top: 8px; left: 8px; border-top: 2px solid; border-left: 2px solid; }
        .lux-corner-tr { top: 8px; right: 8px; border-top: 2px solid; border-right: 2px solid; }
        .lux-corner-bl { bottom: 8px; left: 8px; border-bottom: 2px solid; border-left: 2px solid; }
        .lux-corner-br { bottom: 8px; right: 8px; border-bottom: 2px solid; border-right: 2px solid; }
        .lux-search {
          background: ${surfaceBg}; border: 1px solid ${goldGlow};
          color: ${textColor}; border-radius: 4px;
          padding: 12px 20px 12px 44px; width: 100%; font-size: 14px;
          outline: none; transition: border-color 0.3s, box-shadow 0.3s;
          font-family: 'Georgia', serif;
        }
        .lux-search::placeholder { color: ${mutedText}; }
        .lux-search:focus { border-color: ${accentColor}; box-shadow: 0 0 12px ${accentColor}20; }
        .lux-nav::-webkit-scrollbar { display: none; }
        .lux-nav { -ms-overflow-style: none; scrollbar-width: none; }
        .lux-dots {
          flex: 1; border-bottom: 1px dashed ${accentColor}40;
          margin: 0 16px; min-width: 20px; align-self: flex-end; margin-bottom: 3px;
        }
        @keyframes lux-footer-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .lux-footer-anim { animation: lux-footer-in 0.7s ease-out both; }
        .lux-footer-d1 { animation-delay: 0.15s; }
        .lux-footer-d2 { animation-delay: 0.3s; }
        .lux-footer-d3 { animation-delay: 0.45s; }
        .lux-footer-d4 { animation-delay: 0.6s; }
        .lux-social {
          display: inline-flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border: 1px solid ${goldGlow};
          color: ${accentColor}; transition: all 0.4s ease;
        }
        .lux-social:hover {
          background: ${accentColor}; color: ${bgColor};
          box-shadow: 0 0 16px ${accentColor}40; transform: translateY(-2px);
        }
        .lux-flink { color: ${mutedText}; font-size: 13px; transition: color 0.3s; cursor: pointer; font-family: 'Georgia', serif; letter-spacing: 0.02em; }
        .lux-flink:hover { color: ${accentColor}; }
      `}</style>

      {/* ═══ ORNATE HEADER ═══ */}
      <header className="relative overflow-hidden">
        {bannerUrl && (
          <div className="absolute inset-0">
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" style={{ filter: "brightness(0.2) saturate(0.8)" }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${bgColor}60, ${bgColor})` }} />
          </div>
        )}

        {/* Top gold line */}
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

        <div className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20 lg:py-24 text-center">
          {/* Ornamental top */}
          <div className="lux-fade flex items-center justify-center gap-4 mb-6">
            <span className="block h-px w-12 sm:w-20" style={{ backgroundColor: ornamentColor }} />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: accentColor }}>
              <path d="M12 2L14.09 8.26L20.18 8.26L15.05 12.14L17.14 18.4L12 14.52L6.86 18.4L8.95 12.14L3.82 8.26L9.91 8.26L12 2Z" fill="currentColor" opacity="0.7" />
            </svg>
            <span className="block h-px w-12 sm:w-20" style={{ backgroundColor: ornamentColor }} />
          </div>

          {/* Lotus ornament */}
          <div className="lux-fade lux-d1 flex justify-center mb-5">
            <svg width="40" height="28" viewBox="0 0 40 28" fill="none" style={{ color: accentColor, opacity: 0.6 }}>
              <path d="M20 0C20 0 14 8 14 16C14 20 16.5 24 20 28C23.5 24 26 20 26 16C26 8 20 0 20 0Z" fill="currentColor" />
              <path d="M10 6C10 6 6 12 6 18C6 21 8 24 10 26C13 22 14 18 12 14C10 10 10 6 10 6Z" fill="currentColor" opacity="0.5" />
              <path d="M30 6C30 6 34 12 34 18C34 21 32 24 30 26C27 22 26 18 28 14C30 10 30 6 30 6Z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>

          {logoUrl && (
            <div className="lux-fade lux-d1 mx-auto mb-6 h-24 w-24 overflow-hidden rounded-none border-2 sm:h-28 sm:w-28" style={{ borderColor: accentColor }}>
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <h1 className="lux-fade lux-d2 text-3xl font-bold tracking-[0.08em] uppercase sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", color: accentColor }}>
            {restaurantName}
          </h1>

          <p className="lux-fade lux-d3 mx-auto mt-5 max-w-md text-sm sm:text-base leading-relaxed tracking-wide" style={{ color: mutedText, fontFamily: "'Georgia', serif" }}>
            {description}
          </p>

          {/* Bottom ornament */}
          <div className="lux-fade lux-d4 flex items-center justify-center gap-2 mt-8">
            <span className="block h-px w-6" style={{ backgroundColor: ornamentColor }} />
            <span className="block h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accentColor }} />
            <span className="block h-px w-10" style={{ backgroundColor: ornamentColor }} />
            <span className="block h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accentColor }} />
            <span className="block h-px w-6" style={{ backgroundColor: ornamentColor }} />
          </div>

          {showSearch && (
            <div className="lux-fade lux-d5 relative mx-auto mt-10 max-w-sm">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: mutedText }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar plato..." className="lux-search" />
            </div>
          )}
        </div>

        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }} />
      </header>

      {/* ═══ CATEGORY NAV ═══ */}
      {categories.length > 1 && (
        <nav className="sticky top-0 z-10 border-b backdrop-blur-md" style={{ borderColor: goldGlow, backgroundColor: `${bgColor}f0` }}>
          <div className="lux-nav mx-auto flex max-w-3xl gap-3 overflow-x-auto px-6 py-3">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.categoryName
              return (
                <button key={cat.categoryId} onClick={() => { setActiveCategory(cat.categoryName); document.getElementById(`cat-${cat.categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                  className="cursor-pointer whitespace-nowrap px-5 py-2 text-sm font-medium tracking-wider uppercase transition-all duration-300"
                  style={{
                    fontFamily: "'Georgia', serif",
                    backgroundColor: isActive ? accentColor : "transparent",
                    color: isActive ? bgColor : mutedText,
                    border: `1px solid ${isActive ? accentColor : goldGlow}`,
                  }}>
                  {cat.categoryName}
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* ═══ MENU CONTENT ═══ */}
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {featuredItems.length > 0 && !search && (
          <section className="mb-16 lux-fade">
            <LuxHeader title="Especialidades" accentColor={accentColor} ornamentColor={ornamentColor} />
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {featuredItems.map((item, idx) => (
                <LuxCard key={`f-${item.id}`} item={item} palette={palette} delay={idx} featured />
              ))}
            </div>
          </section>
        )}

        {filteredMenu.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg tracking-wide" style={{ color: mutedText, fontFamily: "'Georgia', serif" }}>{search ? "No se encontraron platos." : "No hay platos disponibles."}</p>
          </div>
        ) : (
          <div className="space-y-16">
            {filteredMenu.map((cat) => {
              const itemsWithImg = cat.items.filter((i) => getItemImage(i))
              const itemsNoImg = cat.items.filter((i) => !getItemImage(i))
              return (
                <section key={cat.categoryId} id={`cat-${cat.categoryId}`} className="lux-fade">
                  <LuxHeader title={cat.categoryName} accentColor={accentColor} ornamentColor={ornamentColor} />
                  {itemsWithImg.length > 0 && (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2">
                      {itemsWithImg.map((item, idx) => (
                        <LuxCard key={item.id} item={item} palette={palette} delay={idx} />
                      ))}
                    </div>
                  )}
                  {itemsNoImg.length > 0 && (
                    <div className="mt-8 space-y-0">
                      {itemsNoImg.map((item, idx) => (
                        <LuxListItem key={item.id} item={item} palette={palette} delay={idx} />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {hours?.enabled && hours.schedule.length > 0 && (
          <section className="lux-fade mt-20">
            <LuxHeader title="Horarios" accentColor={accentColor} ornamentColor={ornamentColor} />
            <div className="relative mt-10 border p-6" style={{ borderColor: goldGlow }}>
              <div className="lux-corner lux-corner-tl" /><div className="lux-corner lux-corner-tr" />
              <div className="lux-corner lux-corner-bl" /><div className="lux-corner lux-corner-br" />
              {hours.schedule.map((day, idx) => (
                <div key={day.day} className="flex items-center justify-between py-3"
                  style={{ borderBottom: idx < hours.schedule.length - 1 ? `1px solid ${goldGlow}` : "none" }}>
                  <span className="text-sm tracking-wide" style={{ fontFamily: "'Georgia', serif" }}>{day.day}</span>
                  <span className="text-sm font-semibold tracking-wide" style={{ color: day.closed ? mutedText : accentColor, fontFamily: "'Georgia', serif" }}>
                    {day.closed ? "Cerrado" : `${day.open} — ${day.close}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <LuxFooter restaurantName={restaurantName} description={description} logoUrl={logoUrl}
        categories={categories} hours={hours} contact={contact} socialLinks={socialLinks} palette={palette} />
    </div>
  )
}

/* ─── Subcomponents ─────────────────────────── */

function LuxHeader({ title, accentColor, ornamentColor }: { title: string; accentColor: string; ornamentColor: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-4 mb-2">
        <span className="block h-px flex-1 max-w-24" style={{ background: `linear-gradient(90deg, transparent, ${ornamentColor})` }} />
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: accentColor }}>
          <rect x="3" y="3" width="6" height="6" transform="rotate(45 6 3)" fill="currentColor" opacity="0.6" />
        </svg>
        <span className="block h-px flex-1 max-w-24" style={{ background: `linear-gradient(90deg, ${ornamentColor}, transparent)` }} />
      </div>
      <h2 className="text-xl font-bold uppercase tracking-[0.2em] sm:text-2xl" style={{ color: accentColor, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        {title}
      </h2>
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="block h-px w-8" style={{ backgroundColor: `${accentColor}40` }} />
        <span className="block h-1 w-1 rotate-45" style={{ backgroundColor: `${accentColor}60` }} />
        <span className="block h-px w-8" style={{ backgroundColor: `${accentColor}40` }} />
      </div>
    </div>
  )
}

function LuxCard({ item, palette, delay, featured }: { item: MenuItem; palette: MenuPalette; delay: number; featured?: boolean }) {
  const { accentColor, mutedText, bgColor, isDark } = palette
  const imgSrc = getItemImage(item)
  const goldGlow = `${accentColor}30`

  return (
    <div className={`lux-fade lux-card relative overflow-hidden ${!item.available ? "opacity-50" : ""}`}
      style={{ animationDelay: `${0.1 + delay * 0.1}s`, backgroundColor: bgColor }}>
      <div className="lux-corner lux-corner-tl" /><div className="lux-corner lux-corner-tr" />
      <div className="lux-corner lux-corner-bl" /><div className="lux-corner lux-corner-br" />
      {imgSrc ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <img src={imgSrc} alt={item.name} className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105" loading="lazy" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bgColor} 0%, transparent 60%)` }} />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-lg font-bold tracking-wide sm:text-xl" style={{ fontFamily: "'Georgia', serif", color: accentColor }}>{item.name}</h3>
            {item.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: mutedText }}>{item.description}</p>}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold tracking-wider" style={{ color: accentColor }}>S/. {item.price.toFixed(2)}</span>
              {featured && <span className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 border" style={{ borderColor: goldGlow, color: accentColor }}>★ Especial</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <h3 className="text-lg font-bold tracking-wide" style={{ fontFamily: "'Georgia', serif", color: accentColor }}>{item.name}</h3>
          {item.description && <p className="mt-2 text-sm leading-relaxed" style={{ color: mutedText }}>{item.description}</p>}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold tracking-wider" style={{ color: accentColor }}>S/. {item.price.toFixed(2)}</span>
            {featured && <span className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 border" style={{ borderColor: goldGlow, color: accentColor }}>★ Especial</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function LuxListItem({ item, palette, delay }: { item: MenuItem; palette: MenuPalette; delay: number }) {
  const { accentColor, mutedText } = palette
  return (
    <div className={`lux-fade py-4 ${!item.available ? "opacity-50" : ""}`}
      style={{ animationDelay: `${0.1 + delay * 0.08}s`, borderBottom: `1px solid ${accentColor}15` }}>
      <div className="flex items-baseline">
        <h3 className="font-semibold tracking-wide text-base" style={{ fontFamily: "'Georgia', serif" }}>{item.name}</h3>
        <span className="lux-dots" />
        <span className="text-base font-bold flex-shrink-0 tracking-wider" style={{ color: accentColor }}>S/. {item.price.toFixed(2)}</span>
      </div>
      {item.description && <p className="mt-1 text-xs leading-relaxed" style={{ color: mutedText, fontFamily: "'Georgia', serif" }}>{item.description}</p>}
    </div>
  )
}

/* ─── Footer ─────────────────────────────────── */

function LuxFooter({ restaurantName, description, logoUrl, categories, hours, contact, socialLinks, palette }: {
  restaurantName: string; description: string; logoUrl: string | null
  categories: MenuCategory[]; hours: MenuHours | null; contact: MenuContact | null; socialLinks: MenuSocialLinks | null
  palette: MenuPalette
}) {
  const { accentColor, mutedText, subtleText, borderColor, bgColor, isDark } = palette
  const goldGlow = `${accentColor}30`
  const hasSocial = socialLinks && (socialLinks.facebook || socialLinks.instagram || socialLinks.tiktok || socialLinks.whatsapp)
  const hasMap = contact?.googleMapsUrl

  return (
    <footer style={{ backgroundColor: isDark ? `rgba(0,0,0,0.5)` : "rgba(0,0,0,0.03)" }}>
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
      <div className="mx-auto max-w-3xl px-6 py-14">
        {hasMap && (
          <div className="lux-footer-anim relative mb-12 border p-1" style={{ borderColor: goldGlow }}>
            <div className="lux-corner lux-corner-tl" /><div className="lux-corner lux-corner-tr" />
            <div className="lux-corner lux-corner-bl" /><div className="lux-corner lux-corner-br" />
            <iframe src={contact.googleMapsUrl} className="h-48 w-full border-0 sm:h-56" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicacion" allowFullScreen />
          </div>
        )}

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lux-footer-anim lux-footer-d1 sm:col-span-2 lg:col-span-1">
            {logoUrl ? (
              <div className="mb-4 h-14 w-14 overflow-hidden border" style={{ borderColor: accentColor }}>
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="mb-4 flex h-14 w-14 items-center justify-center border" style={{ borderColor: goldGlow, color: accentColor }}>
                <UtensilsIcon />
              </div>
            )}
            <h3 className="text-lg font-bold uppercase tracking-[0.1em]" style={{ fontFamily: "'Georgia', serif", color: accentColor }}>{restaurantName}</h3>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: mutedText, fontFamily: "'Georgia', serif" }}>{description}</p>
          </div>

          <div className="lux-footer-anim lux-footer-d2">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>Menu</h4>
            <ul className="space-y-2.5">
              <li><button className="lux-flink" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Inicio</button></li>
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.categoryId}><button className="lux-flink" onClick={() => document.getElementById(`cat-${cat.categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{cat.categoryName}</button></li>
              ))}
            </ul>
          </div>

          <div className="lux-footer-anim lux-footer-d3">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>Horario</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-xs" style={{ color: mutedText, fontFamily: "'Georgia', serif" }}>
                <ClockIcon />
                {hours?.enabled ? (() => {
                  const today = new Date().toLocaleDateString("es-PE", { weekday: "long" })
                  const s = hours.schedule.find((d) => d.day.toLowerCase() === today.toLowerCase())
                  return s && !s.closed ? `Hoy: ${s.open} — ${s.close}` : "Hoy: Cerrado"
                })() : "Consultar horarios"}
              </li>
            </ul>
          </div>

          <div className="lux-footer-anim lux-footer-d4">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>Contacto</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-xs" style={{ color: mutedText }}><MapPinIcon /><span style={{ fontFamily: "'Georgia', serif" }}>{contact?.address || "Visita nuestro local"}</span></li>
              <li className="flex items-start gap-2.5 text-xs" style={{ color: mutedText }}>
                <PhoneIcon />{contact?.phone ? <a href={`tel:${contact.phone}`} className="lux-flink">{contact.phone}</a> : <span>Reservaciones</span>}
              </li>
              <li className="flex items-start gap-2.5 text-xs" style={{ color: mutedText }}>
                <MailIcon />{contact?.email ? <a href={`mailto:${contact.email}`} className="lux-flink">{contact.email}</a> : <span>Escribenos</span>}
              </li>
            </ul>
            {hasSocial && (
              <div className="mt-5 flex items-center gap-2">
                {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="lux-social" aria-label="Facebook"><FacebookIcon /></a>}
                {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="lux-social" aria-label="Instagram"><InstagramIcon /></a>}
                {socialLinks.tiktok && <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="lux-social" aria-label="TikTok"><TiktokIcon /></a>}
                {socialLinks.whatsapp && <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="lux-social" aria-label="WhatsApp"><WhatsAppIcon /></a>}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="block h-px w-10" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40)` }} />
            <span className="block h-1 w-1 rotate-45" style={{ backgroundColor: `${accentColor}50` }} />
            <span className="block h-px w-10" style={{ background: `linear-gradient(90deg, ${accentColor}40, transparent)` }} />
          </div>
          <p className="text-[11px] tracking-wider" style={{ color: subtleText, fontFamily: "'Georgia', serif" }}>© {new Date().getFullYear()} {restaurantName}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
