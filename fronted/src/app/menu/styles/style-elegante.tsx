"use client"

import { useState } from "react"
import type { MenuStyleProps, MenuItem, MenuCategory, MenuHours, MenuContact, MenuSocialLinks, MenuPalette } from "../menu-types"
import { getItemImage } from "../menu-helpers"
import {
  FacebookIcon, InstagramIcon, TiktokIcon, WhatsAppIcon,
  MapPinIcon, PhoneIcon, MailIcon, UtensilsIcon, ClockIcon, SearchIcon,
} from "../menu-social-icons"

export function StyleElegante(props: MenuStyleProps) {
  const {
    categories, filteredMenu, featuredItems,
    hours, contact, socialLinks, palette, search, setSearch,
    activeCategory, setActiveCategory,
    restaurantName, description, logoUrl, bannerUrl, showSearch,
  } = props
  const { isDark, bgColor, textColor, accentColor, mutedText, subtleText, borderColor, cardBg, cardHoverBg, surfaceBg, pillActiveBg, pillActiveText, pillBg, dotColor } = palette

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      <style>{`
        @keyframes menu-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .menu-fade-up { animation: menu-fade-up 0.5s ease-out both; }
        .menu-stagger-1 { animation-delay: 0.05s; }
        .menu-stagger-2 { animation-delay: 0.1s; }
        .menu-stagger-3 { animation-delay: 0.15s; }
        .menu-stagger-4 { animation-delay: 0.2s; }
        .menu-stagger-5 { animation-delay: 0.25s; }
        .menu-stagger-6 { animation-delay: 0.3s; }
        .menu-dots {
          flex: 1; border-bottom: 2px dotted ${dotColor};
          margin: 0 12px; min-width: 20px; align-self: flex-end; margin-bottom: 4px;
        }
        .menu-item-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .menu-item-card:hover { transform: translateY(-2px); }
        @keyframes footer-slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .footer-animate { animation: footer-slide-up 0.6s ease-out both; }
        .footer-stagger-1 { animation-delay: 0.1s; }
        .footer-stagger-2 { animation-delay: 0.2s; }
        .footer-stagger-3 { animation-delay: 0.3s; }
        .footer-stagger-4 { animation-delay: 0.4s; }
        .footer-social-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid ${borderColor}; color: ${mutedText};
          transition: all 0.3s ease;
        }
        .footer-social-icon:hover {
          background: ${accentColor}; border-color: ${accentColor};
          color: ${isDark ? "#000" : "#fff"};
          transform: translateY(-3px); box-shadow: 0 4px 12px ${accentColor}40;
        }
        .footer-link { color: ${mutedText}; font-size: 13px; transition: color 0.2s ease; cursor: pointer; }
        .footer-link:hover { color: ${accentColor}; }
        .menu-search-input {
          background: ${surfaceBg}; border: 1px solid ${borderColor};
          color: ${textColor}; border-radius: 999px;
          padding: 12px 20px 12px 44px; width: 100%; font-size: 14px;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .menu-search-input::placeholder { color: ${mutedText}; }
        .menu-search-input:focus { border-color: ${accentColor}80; box-shadow: 0 0 0 3px ${accentColor}20; }
        .menu-nav-scroll::-webkit-scrollbar { display: none; }
        .menu-nav-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ═══ HERO ═══ */}
      <header className="relative overflow-hidden">
        {bannerUrl && (
          <div className="absolute inset-0">
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" style={{ filter: "brightness(0.3)" }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${bgColor}40, ${bgColor}ee)` }} />
          </div>
        )}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
        <div className="relative mx-auto max-w-4xl px-5 py-12 sm:py-16 lg:py-20 text-center">
          {logoUrl && (
            <div className="menu-fade-up mx-auto mb-6 h-20 w-20 overflow-hidden rounded-full border-2 sm:h-24 sm:w-24" style={{ borderColor: accentColor }}>
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="menu-fade-up flex items-center justify-center gap-3 mb-4">
            <span className="block h-px w-10 sm:w-16" style={{ backgroundColor: accentColor }} />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: accentColor }}>
              <path d="M8 0L9.79 6.21L16 8L9.79 9.79L8 16L6.21 9.79L0 8L6.21 6.21L8 0Z" fill="currentColor" />
            </svg>
            <span className="block h-px w-10 sm:w-16" style={{ backgroundColor: accentColor }} />
          </div>
          <h1 className="menu-fade-up menu-stagger-1 text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            {restaurantName}
          </h1>
          <p className="menu-fade-up menu-stagger-2 mx-auto mt-4 max-w-lg text-sm sm:text-base leading-relaxed" style={{ color: mutedText }}>
            {description}
          </p>
          <div className="menu-fade-up menu-stagger-3 flex items-center justify-center gap-3 mt-6">
            <span className="block h-px w-8 sm:w-12" style={{ backgroundColor: `${accentColor}60` }} />
            <span className="block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="block h-px w-8 sm:w-12" style={{ backgroundColor: `${accentColor}60` }} />
          </div>
          {showSearch && (
            <div className="menu-fade-up menu-stagger-4 relative mx-auto mt-8 max-w-md">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: mutedText }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en la carta..." className="menu-search-input" />
            </div>
          )}
        </div>
      </header>

      {/* ═══ CATEGORY NAV ═══ */}
      {categories.length > 1 && (
        <nav className="sticky top-0 z-10 border-b border-t backdrop-blur-md" style={{ borderColor, backgroundColor: isDark ? `${bgColor}ee` : `${bgColor}f5` }}>
          <div className="menu-nav-scroll mx-auto flex max-w-4xl gap-2 overflow-x-auto px-5 py-3">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.categoryName
              return (
                <button key={cat.categoryId} onClick={() => { setActiveCategory(cat.categoryName); document.getElementById(`cat-${cat.categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                  className="cursor-pointer whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all duration-200"
                  style={{ backgroundColor: isActive ? pillActiveBg : pillBg, color: isActive ? pillActiveText : mutedText, boxShadow: isActive ? `0 2px 8px ${accentColor}40` : "none" }}>
                  {cat.categoryName}
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* ═══ MENU CONTENT ═══ */}
      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        {featuredItems.length > 0 && !search && (
          <section className="mb-16 menu-fade-up">
            <EleganteHeader title="Destacados" accentColor={accentColor} />
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {featuredItems.map((item, idx) => (
                <FeaturedCard key={`f-${item.id}`} item={item} palette={palette} stagger={idx} />
              ))}
            </div>
          </section>
        )}

        {filteredMenu.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg" style={{ color: mutedText }}>{search ? "No se encontraron platos." : "No hay platos disponibles."}</p>
          </div>
        ) : (
          <div className="space-y-16">
            {filteredMenu.map((cat) => {
              const itemsWithImg = cat.items.filter((i) => getItemImage(i))
              const itemsNoImg = cat.items.filter((i) => !getItemImage(i))
              return (
                <section key={cat.categoryId} id={`cat-${cat.categoryId}`} className="menu-fade-up">
                  <EleganteHeader title={cat.categoryName} accentColor={accentColor} />
                  {itemsWithImg.length > 0 && (
                    <div className="mt-8 grid gap-5 sm:grid-cols-2">
                      {itemsWithImg.map((item, idx) => (
                        <ImageCard key={item.id} item={item} palette={palette} stagger={idx} />
                      ))}
                    </div>
                  )}
                  {itemsNoImg.length > 0 && (
                    <div className="mt-8 space-y-1">
                      {itemsNoImg.map((item, idx) => (
                        <ListItem key={item.id} item={item} palette={palette} stagger={idx} />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {hours?.enabled && hours.schedule.length > 0 && (
          <section className="menu-fade-up mt-20">
            <EleganteHeader title="Horarios de Atencion" accentColor={accentColor} />
            <div className="mt-8 overflow-hidden rounded-2xl border" style={{ borderColor, backgroundColor: surfaceBg }}>
              {hours.schedule.map((day, idx) => (
                <div key={day.day} className="flex items-center justify-between px-5 py-3.5 sm:px-6"
                  style={{ borderBottom: idx < hours.schedule.length - 1 ? `1px solid ${borderColor}` : "none" }}>
                  <span className="text-sm font-medium">{day.day}</span>
                  <span className="text-sm font-semibold" style={{ color: day.closed ? mutedText : accentColor }}>
                    {day.closed ? "Cerrado" : `${day.open} — ${day.close}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <EleganteFooter
        restaurantName={restaurantName} description={description} logoUrl={logoUrl}
        categories={categories} hours={hours} contact={contact} socialLinks={socialLinks}
        palette={palette}
      />
    </div>
  )
}

/* ─── Subcomponents ─────────────────────────────── */

function EleganteHeader({ title, accentColor }: { title: string; accentColor: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="block h-px flex-1" style={{ backgroundColor: `${accentColor}30` }} />
      <h2 className="text-center text-xl font-bold uppercase tracking-[0.15em] sm:text-2xl" style={{ color: accentColor, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        {title}
      </h2>
      <span className="block h-px flex-1" style={{ backgroundColor: `${accentColor}30` }} />
    </div>
  )
}

function FeaturedCard({ item, palette, stagger }: { item: MenuItem; palette: MenuPalette; stagger: number }) {
  const { accentColor, mutedText, cardBg, borderColor, isDark } = palette
  const imgSrc = getItemImage(item)
  const sc = `menu-stagger-${Math.min(stagger + 1, 6)}`

  return (
    <div className={`menu-fade-up menu-item-card group relative overflow-hidden rounded-2xl border ${sc} ${!item.available ? "opacity-50" : ""}`} style={{ borderColor, backgroundColor: cardBg }}>
      {imgSrc ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <img src={imgSrc} alt={item.name} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)"} 0%, transparent 60%)` }} />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold leading-tight text-white sm:text-xl" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>{item.name}</h3>
                {item.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/70 sm:text-sm">{item.description}</p>}
              </div>
              <span className="flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-bold text-white sm:text-base" style={{ backgroundColor: accentColor }}>S/. {item.price.toFixed(2)}</span>
            </div>
            <ItemBadges item={item} accentColor={accentColor} />
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-tight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>{item.name}</h3>
              {item.description && <p className="mt-1 text-sm leading-relaxed" style={{ color: mutedText }}>{item.description}</p>}
            </div>
            <span className="flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-bold" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>S/. {item.price.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageCard({ item, palette, stagger }: { item: MenuItem; palette: MenuPalette; stagger: number }) {
  const [hovered, setHovered] = useState(false)
  const { accentColor, mutedText, cardBg, cardHoverBg, borderColor, isDark } = palette
  const imgSrc = getItemImage(item)
  const sc = `menu-stagger-${Math.min(stagger + 1, 6)}`

  return (
    <div className={`menu-fade-up menu-item-card group overflow-hidden rounded-2xl border ${sc} ${!item.available ? "opacity-50" : ""}`}
      style={{ borderColor, backgroundColor: hovered ? cardHoverBg : cardBg }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <img src={imgSrc!} alt={item.name} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.45)"} 0%, transparent 50%)` }} />
        <div className="absolute right-3 top-3">
          <span className="rounded-full px-3.5 py-1.5 text-sm font-bold text-white shadow-lg" style={{ backgroundColor: accentColor }}>S/. {item.price.toFixed(2)}</span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {item.featured && <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm" style={{ backgroundColor: `${accentColor}40`, color: "#fff" }}>★ Destacado</span>}
          {item.prepTime != null && <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">~{item.prepTime} min</span>}
          {!item.available && <span className="rounded-full bg-red-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white">Agotado</span>}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-base font-bold leading-tight sm:text-lg" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>{item.name}</h3>
        {item.description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed sm:text-sm" style={{ color: mutedText }}>{item.description}</p>}
      </div>
    </div>
  )
}

function ListItem({ item, palette, stagger }: { item: MenuItem; palette: MenuPalette; stagger: number }) {
  const { accentColor, mutedText, borderColor } = palette
  const sc = `menu-stagger-${Math.min(stagger + 1, 6)}`
  return (
    <div className={`menu-fade-up group rounded-xl px-4 py-4 transition-colors ${sc} ${!item.available ? "opacity-50" : ""}`} style={{ borderBottom: `1px solid ${borderColor}` }}>
      <div className="flex items-baseline">
        <h3 className="font-semibold leading-tight text-base" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>{item.name}</h3>
        <span className="menu-dots" />
        <span className="text-base font-bold flex-shrink-0" style={{ color: accentColor }}>S/. {item.price.toFixed(2)}</span>
      </div>
      {item.description && <p className="mt-1 text-xs leading-relaxed sm:text-sm" style={{ color: mutedText }}>{item.description}</p>}
      {(item.featured || item.prepTime != null || !item.available) && (
        <div className="mt-2 flex items-center gap-2">
          {item.featured && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>★ Destacado</span>}
          {item.prepTime != null && <span className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor, color: mutedText }}>~{item.prepTime} min</span>}
          {!item.available && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">Agotado</span>}
        </div>
      )}
    </div>
  )
}

function ItemBadges({ item, accentColor }: { item: MenuItem; accentColor: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      {item.featured && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: `${accentColor}30`, color: accentColor }}>★ Destacado</span>}
      {item.prepTime != null && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white/60 backdrop-blur-sm">~{item.prepTime} min</span>}
      {!item.available && <span className="rounded-full bg-red-500/80 px-2.5 py-0.5 text-[10px] font-semibold text-white">Agotado</span>}
    </div>
  )
}

/* ─── Footer ─────────────────────────────────────── */

function EleganteFooter({ restaurantName, description, logoUrl, categories, hours, contact, socialLinks, palette }: {
  restaurantName: string; description: string; logoUrl: string | null
  categories: MenuCategory[]; hours: MenuHours | null; contact: MenuContact | null; socialLinks: MenuSocialLinks | null
  palette: MenuPalette
}) {
  const { accentColor, mutedText, borderColor, isDark } = palette
  const hasSocial = socialLinks && (socialLinks.facebook || socialLinks.instagram || socialLinks.tiktok || socialLinks.whatsapp)
  const hasMap = contact?.googleMapsUrl

  return (
    <footer className="border-t" style={{ borderColor, backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.03)" }}>
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
      <div className="mx-auto max-w-4xl px-5 py-12 sm:py-14">
        {hasMap && (
          <div className="footer-animate mb-10 overflow-hidden rounded-2xl border" style={{ borderColor }}>
            <iframe src={contact.googleMapsUrl} className="h-48 w-full border-0 sm:h-56" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicacion" allowFullScreen />
          </div>
        )}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="footer-animate footer-stagger-1 sm:col-span-2 lg:col-span-1">
            {logoUrl ? (
              <div className="mb-4 h-12 w-12 overflow-hidden rounded-full border" style={{ borderColor: `${accentColor}60` }}>
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                <UtensilsIcon />
              </div>
            )}
            <h3 className="text-lg font-bold" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>{restaurantName}</h3>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: mutedText }}>{description}</p>
          </div>
          <div className="footer-animate footer-stagger-2">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: accentColor }}>Acceso Rapido</h4>
            <ul className="space-y-2.5">
              <li><button className="footer-link" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Inicio</button></li>
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.categoryId}><button className="footer-link" onClick={() => document.getElementById(`cat-${cat.categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{cat.categoryName}</button></li>
              ))}
            </ul>
          </div>
          <div className="footer-animate footer-stagger-3">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: accentColor }}>Informacion</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-xs" style={{ color: mutedText }}><span className="flex-shrink-0" style={{ color: mutedText }}><UtensilsIcon /></span>Carta digital</li>
              <li className="flex items-center gap-2 text-xs" style={{ color: mutedText }}>
                <ClockIcon />
                {hours?.enabled ? (() => {
                  const today = new Date().toLocaleDateString("es-PE", { weekday: "long" })
                  const s = hours.schedule.find((d) => d.day.toLowerCase() === today.toLowerCase())
                  return s && !s.closed ? `Hoy: ${s.open} — ${s.close}` : "Hoy: Cerrado"
                })() : "Horario disponible"}
              </li>
            </ul>
          </div>
          <div className="footer-animate footer-stagger-4">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: accentColor }}>Contactanos</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-xs" style={{ color: mutedText }}>
                <MapPinIcon /><span>{contact?.address || "Visita nuestro local"}</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs" style={{ color: mutedText }}>
                <PhoneIcon />
                {contact?.phone ? <a href={`tel:${contact.phone}`} className="footer-link">{contact.phone}</a> : <span>Llama para reservar</span>}
              </li>
              <li className="flex items-start gap-2.5 text-xs" style={{ color: mutedText }}>
                <MailIcon />
                {contact?.email ? <a href={`mailto:${contact.email}`} className="footer-link">{contact.email}</a> : <span>Escribenos</span>}
              </li>
            </ul>
            {hasSocial && (
              <div className="mt-5 flex items-center gap-2.5">
                {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Facebook"><FacebookIcon /></a>}
                {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Instagram"><InstagramIcon /></a>}
                {socialLinks.tiktok && <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="TikTok"><TiktokIcon /></a>}
                {socialLinks.whatsapp && <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="WhatsApp"><WhatsAppIcon /></a>}
              </div>
            )}
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center" style={{ borderColor }}>
          <p className="text-[11px]" style={{ color: palette.subtleText }}>© {new Date().getFullYear()} {restaurantName}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
