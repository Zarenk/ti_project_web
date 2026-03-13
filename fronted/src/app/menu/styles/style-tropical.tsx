"use client"

import { useState } from "react"
import type { MenuStyleProps, MenuItem, MenuCategory, MenuHours, MenuContact, MenuSocialLinks, MenuPalette } from "../menu-types"
import { getItemImage } from "../menu-helpers"
import {
  FacebookIcon, InstagramIcon, TiktokIcon, WhatsAppIcon,
  MapPinIcon, PhoneIcon, MailIcon, UtensilsIcon, ClockIcon, SearchIcon,
} from "../menu-social-icons"

export function StyleTropical(props: MenuStyleProps) {
  const {
    categories, filteredMenu, featuredItems,
    hours, contact, socialLinks, palette, search, setSearch,
    activeCategory, setActiveCategory,
    restaurantName, description, logoUrl, bannerUrl, showSearch,
  } = props
  const { isDark, bgColor, textColor, accentColor, mutedText, borderColor, cardBg, surfaceBg, pillActiveBg, pillActiveText, pillBg } = palette

  const headerBg = isDark ? "#1a1a1a" : "#333333"

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      <style>{`
        @keyframes trop-slide {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes trop-fade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .trop-slide { animation: trop-slide 0.4s ease-out both; }
        .trop-fade { animation: trop-fade 0.4s ease-out both; }
        .trop-d1 { animation-delay: 0.05s; }
        .trop-d2 { animation-delay: 0.1s; }
        .trop-d3 { animation-delay: 0.15s; }
        .trop-d4 { animation-delay: 0.2s; }
        .trop-d5 { animation-delay: 0.25s; }
        .trop-d6 { animation-delay: 0.3s; }
        .trop-card {
          overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .trop-card:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }
        .trop-search {
          background: ${surfaceBg}; border: 2px solid ${accentColor}40;
          color: ${textColor}; border-radius: 6px;
          padding: 12px 16px 12px 44px; width: 100%; font-size: 14px;
          font-weight: 600; outline: none; transition: border-color 0.2s;
        }
        .trop-search::placeholder { color: ${mutedText}; font-weight: 400; }
        .trop-search:focus { border-color: ${accentColor}; }
        .trop-nav::-webkit-scrollbar { display: none; }
        .trop-nav { -ms-overflow-style: none; scrollbar-width: none; }
        .trop-divider { height: 3px; background: ${accentColor}; }
        @keyframes trop-footer {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .trop-footer-anim { animation: trop-footer 0.5s ease-out both; }
        .trop-fd1 { animation-delay: 0.1s; }
        .trop-fd2 { animation-delay: 0.2s; }
        .trop-fd3 { animation-delay: 0.3s; }
        .trop-fd4 { animation-delay: 0.4s; }
        .trop-social {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 6px;
          background: ${accentColor}20; color: ${accentColor};
          transition: all 0.2s ease;
        }
        .trop-social:hover { background: ${accentColor}; color: #fff; transform: scale(1.1); }
        .trop-flink { color: ${mutedText}; font-size: 13px; font-weight: 600; transition: color 0.2s; cursor: pointer; }
        .trop-flink:hover { color: ${accentColor}; }
      `}</style>

      {/* ═══ BOLD HEADER ═══ */}
      <header style={{ backgroundColor: headerBg }}>
        {bannerUrl && (
          <div className="relative h-48 sm:h-56 w-full overflow-hidden">
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" style={{ filter: "brightness(0.5)" }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent, ${headerBg})` }} />
          </div>
        )}

        <div className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {logoUrl && (
                <div className="trop-slide h-16 w-16 overflow-hidden rounded-lg sm:h-20 sm:w-20" style={{ border: `3px solid ${accentColor}` }}>
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div>
                <h1 className="trop-slide trop-d1 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>
                  {restaurantName}
                </h1>
                <p className="trop-slide trop-d2 mt-1 text-sm font-medium text-white/60">{description}</p>
              </div>
            </div>

            {/* Contact bar */}
            {(contact?.phone || hours?.enabled) && (
              <div className="trop-slide trop-d3 flex items-center gap-3">
                {contact?.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>
                    <PhoneIcon />
                    {contact.phone}
                  </a>
                )}
                {hours?.enabled && (() => {
                  const today = new Date().toLocaleDateString("es-PE", { weekday: "long" })
                  const s = hours.schedule.find((d) => d.day.toLowerCase() === today.toLowerCase())
                  if (!s || s.closed) return null
                  return (
                    <span className="hidden sm:flex items-center gap-2 text-xs font-semibold text-white/50">
                      <ClockIcon /> {s.open} - {s.close}
                    </span>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Accent bar */}
          <div className="trop-divider mt-6" />

          {/* CARTA title */}
          <div className="mt-4 flex items-center justify-between">
            <h2 className="trop-fade trop-d3 text-lg font-black uppercase tracking-wider text-white/90">CARTA</h2>
            {showSearch && (
              <div className="trop-fade trop-d4 relative w-full max-w-xs">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: mutedText }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="trop-search" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ CATEGORY TAB BAR ═══ */}
      {categories.length > 1 && (
        <nav className="sticky top-0 z-10 border-b" style={{ borderColor, backgroundColor: `${bgColor}f5` }}>
          <div className="trop-nav mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5 py-2">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.categoryName
              return (
                <button key={cat.categoryId} onClick={() => { setActiveCategory(cat.categoryName); document.getElementById(`cat-${cat.categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                  className="cursor-pointer whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? accentColor : "transparent",
                    color: isActive ? "#fff" : mutedText,
                  }}>
                  {cat.categoryName}
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* ═══ CONTENT ═══ */}
      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
        {featuredItems.length > 0 && !search && (
          <section className="mb-10 trop-fade">
            <TropHeader title="Destacados" accentColor={accentColor} />
            <div className="mt-5 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {featuredItems.map((item, idx) => (
                <TropCard key={`f-${item.id}`} item={item} palette={palette} delay={idx} />
              ))}
            </div>
          </section>
        )}

        {filteredMenu.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-bold" style={{ color: mutedText }}>{search ? "Sin resultados." : "No hay platos."}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredMenu.map((cat) => (
              <section key={cat.categoryId} id={`cat-${cat.categoryId}`} className="trop-fade">
                <TropHeader title={cat.categoryName} accentColor={accentColor} />
                <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {cat.items.map((item, idx) => {
                    const img = getItemImage(item)
                    return img
                      ? <TropCard key={item.id} item={item} palette={palette} delay={idx} />
                      : <TropRow key={item.id} item={item} palette={palette} delay={idx} />
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {hours?.enabled && hours.schedule.length > 0 && (
          <section className="trop-fade mt-14">
            <TropHeader title="Horarios" accentColor={accentColor} />
            <div className="mt-5 grid gap-2 grid-cols-2 sm:grid-cols-4">
              {hours.schedule.map((day) => (
                <div key={day.day} className="rounded-lg p-3 text-center" style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>{day.day.slice(0, 3)}</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: day.closed ? mutedText : textColor }}>
                    {day.closed ? "Cerrado" : `${day.open} — ${day.close}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <TropFooter restaurantName={restaurantName} description={description} logoUrl={logoUrl}
        categories={categories} hours={hours} contact={contact} socialLinks={socialLinks} palette={palette} headerBg={headerBg} />
    </div>
  )
}

/* ─── Subcomponents ─────────────────────────── */

function TropHeader({ title, accentColor }: { title: string; accentColor: string }) {
  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-wider sm:text-2xl" style={{ fontFamily: "'Arial Black', sans-serif" }}>
        {title}
      </h2>
      <div className="mt-1.5 h-1 w-12" style={{ backgroundColor: accentColor }} />
    </div>
  )
}

function TropCard({ item, palette, delay }: { item: MenuItem; palette: MenuPalette; delay: number }) {
  const { accentColor, mutedText, cardBg, borderColor, isDark } = palette
  const imgSrc = getItemImage(item)

  return (
    <div className={`trop-fade trop-card rounded-lg border ${!item.available ? "opacity-50" : ""}`}
      style={{ animationDelay: `${0.05 + delay * 0.04}s`, borderColor, backgroundColor: cardBg }}>
      {imgSrc && (
        <div className="relative aspect-square w-full overflow-hidden">
          <img src={imgSrc} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" loading="lazy" />
          {!item.available && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white">AGOTADO</span></div>}
        </div>
      )}
      <div className="p-3">
        <h3 className="text-sm font-bold leading-tight">{item.name}</h3>
        {item.description && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed" style={{ color: mutedText }}>{item.description}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-black" style={{ color: accentColor }}>S/. {item.price.toFixed(2)}</span>
          {item.prepTime != null && <span className="text-[10px] font-semibold" style={{ color: mutedText }}>~{item.prepTime}m</span>}
        </div>
      </div>
    </div>
  )
}

function TropRow({ item, palette, delay }: { item: MenuItem; palette: MenuPalette; delay: number }) {
  const { accentColor, mutedText, borderColor, surfaceBg } = palette

  return (
    <div className={`trop-fade flex items-center justify-between gap-3 rounded-lg px-4 py-3 ${!item.available ? "opacity-50" : ""}`}
      style={{ animationDelay: `${0.05 + delay * 0.04}s`, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
      <div className="min-w-0">
        <h3 className="text-sm font-bold">{item.name}</h3>
        {item.description && <p className="mt-0.5 text-[11px] line-clamp-1" style={{ color: mutedText }}>{item.description}</p>}
      </div>
      <span className="text-sm font-black flex-shrink-0" style={{ color: accentColor }}>S/. {item.price.toFixed(2)}</span>
    </div>
  )
}

/* ─── Footer ─────────────────────────── */

function TropFooter({ restaurantName, description, logoUrl, categories, hours, contact, socialLinks, palette, headerBg }: {
  restaurantName: string; description: string; logoUrl: string | null
  categories: MenuCategory[]; hours: MenuHours | null; contact: MenuContact | null; socialLinks: MenuSocialLinks | null
  palette: MenuPalette; headerBg: string
}) {
  const { accentColor, mutedText, subtleText, borderColor } = palette
  const hasSocial = socialLinks && (socialLinks.facebook || socialLinks.instagram || socialLinks.tiktok || socialLinks.whatsapp)
  const hasMap = contact?.googleMapsUrl

  return (
    <footer style={{ backgroundColor: headerBg, color: "#fff" }}>
      <div className="h-1" style={{ backgroundColor: accentColor }} />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-12">
        {hasMap && (
          <div className="trop-footer-anim mb-8 overflow-hidden rounded-lg">
            <iframe src={contact.googleMapsUrl} className="h-44 w-full border-0 sm:h-52" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicacion" allowFullScreen />
          </div>
        )}

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="trop-footer-anim trop-fd1">
            <div className="flex items-center gap-3 mb-4">
              {logoUrl && (
                <div className="h-10 w-10 overflow-hidden rounded-lg" style={{ border: `2px solid ${accentColor}` }}>
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <h3 className="text-lg font-black uppercase tracking-tight" style={{ fontFamily: "'Arial Black', sans-serif" }}>{restaurantName}</h3>
            </div>
            <p className="text-xs leading-relaxed text-white/50">{description}</p>
          </div>

          <div className="trop-footer-anim trop-fd2">
            <h4 className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: accentColor }}>Menu</h4>
            <ul className="space-y-2">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.categoryId}><button className="trop-flink text-white/60 hover:text-white" onClick={() => document.getElementById(`cat-${cat.categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{cat.categoryName}</button></li>
              ))}
            </ul>
          </div>

          <div className="trop-footer-anim trop-fd3">
            <h4 className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: accentColor }}>Contacto</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-xs text-white/60"><MapPinIcon /><span>{contact?.address || "Visita nuestro local"}</span></li>
              <li className="flex items-start gap-2.5 text-xs text-white/60">
                <PhoneIcon />{contact?.phone ? <a href={`tel:${contact.phone}`} className="trop-flink text-white/60 hover:text-white">{contact.phone}</a> : <span>Reservaciones</span>}
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/60">
                <MailIcon />{contact?.email ? <a href={`mailto:${contact.email}`} className="trop-flink text-white/60 hover:text-white">{contact.email}</a> : <span>Escribenos</span>}
              </li>
            </ul>
          </div>

          <div className="trop-footer-anim trop-fd4">
            <h4 className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: accentColor }}>Siguenos</h4>
            {hasSocial ? (
              <div className="flex items-center gap-2">
                {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="trop-social" aria-label="Facebook"><FacebookIcon /></a>}
                {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="trop-social" aria-label="Instagram"><InstagramIcon /></a>}
                {socialLinks.tiktok && <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="trop-social" aria-label="TikTok"><TiktokIcon /></a>}
                {socialLinks.whatsapp && <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="trop-social" aria-label="WhatsApp"><WhatsAppIcon /></a>}
              </div>
            ) : (
              <p className="text-xs text-white/40">Proximamente</p>
            )}
            {hours?.enabled && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Hoy</p>
                {(() => {
                  const today = new Date().toLocaleDateString("es-PE", { weekday: "long" })
                  const s = hours.schedule.find((d) => d.day.toLowerCase() === today.toLowerCase())
                  return <p className="text-sm font-bold" style={{ color: s && !s.closed ? accentColor : "rgba(255,255,255,0.4)" }}>{s && !s.closed ? `${s.open} — ${s.close}` : "Cerrado"}</p>
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-white/30">© {new Date().getFullYear()} {restaurantName}</p>
          <p className="text-[11px] text-white/30">Carta Digital</p>
        </div>
      </div>
    </footer>
  )
}
