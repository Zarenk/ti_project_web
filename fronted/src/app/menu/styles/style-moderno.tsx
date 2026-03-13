"use client"

import { useState } from "react"
import type { MenuStyleProps, MenuItem, MenuCategory, MenuHours, MenuContact, MenuSocialLinks, MenuPalette } from "../menu-types"
import { getItemImage } from "../menu-helpers"
import {
  FacebookIcon, InstagramIcon, TiktokIcon, WhatsAppIcon,
  MapPinIcon, PhoneIcon, MailIcon, UtensilsIcon, ClockIcon, SearchIcon,
} from "../menu-social-icons"

export function StyleModerno(props: MenuStyleProps) {
  const {
    categories, filteredMenu, featuredItems,
    hours, contact, socialLinks, palette, search, setSearch,
    activeCategory, setActiveCategory,
    restaurantName, description, logoUrl, bannerUrl, showSearch,
  } = props
  const { isDark, bgColor, textColor, accentColor, mutedText, borderColor, cardBg, surfaceBg, pillActiveBg, pillActiveText, pillBg } = palette

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      <style>{`
        @keyframes mod-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mod-anim { animation: mod-slide-up 0.4s ease-out both; }
        .mod-d1 { animation-delay: 0.05s; }
        .mod-d2 { animation-delay: 0.1s; }
        .mod-d3 { animation-delay: 0.15s; }
        .mod-d4 { animation-delay: 0.2s; }
        .mod-d5 { animation-delay: 0.25s; }
        .mod-d6 { animation-delay: 0.3s; }
        .mod-card {
          border-radius: 16px; overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          background: ${cardBg}; border: 1px solid ${borderColor};
        }
        .mod-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px ${isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)"}; }
        .mod-search {
          background: ${surfaceBg}; border: 1px solid ${borderColor};
          color: ${textColor}; border-radius: 12px;
          padding: 14px 20px 14px 48px; width: 100%; font-size: 15px;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .mod-search::placeholder { color: ${mutedText}; }
        .mod-search:focus { border-color: ${accentColor}; box-shadow: 0 0 0 3px ${accentColor}15; }
        .mod-nav::-webkit-scrollbar { display: none; }
        .mod-nav { -ms-overflow-style: none; scrollbar-width: none; }
        .mod-list-divider {
          border-bottom: 1px solid ${borderColor};
        }
        @keyframes mod-footer-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mod-footer { animation: mod-footer-in 0.5s ease-out both; }
        .mod-fd1 { animation-delay: 0.1s; }
        .mod-fd2 { animation-delay: 0.2s; }
        .mod-fd3 { animation-delay: 0.3s; }
        .mod-fd4 { animation-delay: 0.4s; }
        .mod-social {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 12px;
          background: ${surfaceBg}; color: ${mutedText};
          transition: all 0.2s ease;
        }
        .mod-social:hover { background: ${accentColor}; color: #fff; transform: translateY(-2px); }
        .mod-flink { color: ${mutedText}; font-size: 14px; transition: color 0.2s; cursor: pointer; }
        .mod-flink:hover { color: ${accentColor}; }
      `}</style>

      {/* ═══ CLEAN HEADER ═══ */}
      <header className="relative overflow-hidden">
        {bannerUrl && (
          <div className="absolute inset-0">
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" style={{ filter: isDark ? "brightness(0.3)" : "brightness(0.9)" }} />
            <div className="absolute inset-0" style={{ background: isDark ? `${bgColor}cc` : `${bgColor}e0` }} />
          </div>
        )}

        <div className="relative mx-auto max-w-5xl px-5 py-10 sm:py-14 lg:py-16">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            {logoUrl && (
              <div className="mod-anim h-16 w-16 overflow-hidden rounded-2xl shadow-lg sm:h-20 sm:w-20" style={{ border: `2px solid ${accentColor}30` }}>
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="text-center sm:text-left">
              <h1 className="mod-anim mod-d1 text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {restaurantName}
              </h1>
              <p className="mod-anim mod-d2 mt-2 text-sm sm:text-base" style={{ color: mutedText }}>
                {description}
              </p>
            </div>
          </div>

          {showSearch && (
            <div className="mod-anim mod-d3 relative mx-auto mt-8 max-w-lg sm:mx-0">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: mutedText }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar platos, bebidas..." className="mod-search" />
            </div>
          )}
        </div>
      </header>

      {/* ═══ CATEGORY CHIPS ═══ */}
      {categories.length > 1 && (
        <nav className="sticky top-0 z-10 border-b backdrop-blur-md" style={{ borderColor, backgroundColor: `${bgColor}f2` }}>
          <div className="mod-nav mx-auto flex max-w-5xl gap-2 overflow-x-auto px-5 py-3">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.categoryName
              return (
                <button key={cat.categoryId} onClick={() => { setActiveCategory(cat.categoryName); document.getElementById(`cat-${cat.categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                  className="cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? accentColor : surfaceBg,
                    color: isActive ? "#fff" : mutedText,
                    boxShadow: isActive ? `0 2px 8px ${accentColor}30` : "none",
                  }}>
                  {cat.categoryName}
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* ═══ CONTENT ═══ */}
      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
        {featuredItems.length > 0 && !search && (
          <section className="mb-12 mod-anim">
            <h2 className="text-lg font-bold sm:text-xl" style={{ color: accentColor }}>
              <span className="inline-block mr-2">⭐</span>Destacados
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredItems.map((item, idx) => (
                <ModCard key={`f-${item.id}`} item={item} palette={palette} delay={idx} />
              ))}
            </div>
          </section>
        )}

        {filteredMenu.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg" style={{ color: mutedText }}>{search ? "No se encontraron platos." : "No hay platos disponibles."}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredMenu.map((cat) => {
              const itemsWithImg = cat.items.filter((i) => getItemImage(i))
              const itemsNoImg = cat.items.filter((i) => !getItemImage(i))
              return (
                <section key={cat.categoryId} id={`cat-${cat.categoryId}`} className="mod-anim">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                      <UtensilsIcon />
                    </div>
                    <h2 className="text-lg font-bold sm:text-xl">{cat.categoryName}</h2>
                    <span className="text-xs font-medium rounded-full px-2.5 py-0.5" style={{ backgroundColor: surfaceBg, color: mutedText }}>{cat.items.length}</span>
                  </div>

                  {itemsWithImg.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {itemsWithImg.map((item, idx) => (
                        <ModCard key={item.id} item={item} palette={palette} delay={idx} />
                      ))}
                    </div>
                  )}

                  {itemsNoImg.length > 0 && (
                    <div className={`${itemsWithImg.length > 0 ? "mt-6" : ""} rounded-2xl border overflow-hidden`} style={{ borderColor }}>
                      {itemsNoImg.map((item, idx) => (
                        <ModListItem key={item.id} item={item} palette={palette} isLast={idx === itemsNoImg.length - 1} delay={idx} />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {hours?.enabled && hours.schedule.length > 0 && (
          <section className="mod-anim mt-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                <ClockIcon />
              </div>
              <h2 className="text-lg font-bold sm:text-xl">Horarios</h2>
            </div>
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor }}>
              {hours.schedule.map((day, idx) => (
                <div key={day.day} className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: idx < hours.schedule.length - 1 ? `1px solid ${borderColor}` : "none", backgroundColor: idx % 2 === 0 ? "transparent" : surfaceBg }}>
                  <span className="text-sm font-medium">{day.day}</span>
                  <span className={`text-sm font-semibold rounded-full px-3 py-0.5 ${day.closed ? "" : ""}`}
                    style={{ color: day.closed ? mutedText : accentColor, backgroundColor: day.closed ? "transparent" : `${accentColor}10` }}>
                    {day.closed ? "Cerrado" : `${day.open} — ${day.close}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <ModFooter restaurantName={restaurantName} description={description} logoUrl={logoUrl}
        categories={categories} hours={hours} contact={contact} socialLinks={socialLinks} palette={palette} />
    </div>
  )
}

/* ─── Cards ──────────────────────────── */

function ModCard({ item, palette, delay }: { item: MenuItem; palette: MenuPalette; delay: number }) {
  const { accentColor, mutedText, cardBg, borderColor, isDark } = palette
  const imgSrc = getItemImage(item)

  return (
    <div className={`mod-anim mod-card ${!item.available ? "opacity-50" : ""}`} style={{ animationDelay: `${0.05 + delay * 0.05}s` }}>
      {imgSrc && (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <img src={imgSrc} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
          {item.featured && (
            <div className="absolute left-3 top-3">
              <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-white shadow" style={{ backgroundColor: accentColor }}>Destacado</span>
            </div>
          )}
          {!item.available && (
            <div className="absolute right-3 top-3">
              <span className="rounded-lg bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white">Agotado</span>
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight sm:text-base">{item.name}</h3>
            {item.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: mutedText }}>{item.description}</p>}
          </div>
          <span className="flex-shrink-0 rounded-xl px-3 py-1 text-sm font-extrabold" style={{ backgroundColor: `${accentColor}12`, color: accentColor }}>
            S/. {item.price.toFixed(2)}
          </span>
        </div>
        {item.prepTime != null && (
          <p className="mt-2 text-[11px]" style={{ color: mutedText }}>⏱ ~{item.prepTime} min</p>
        )}
      </div>
    </div>
  )
}

function ModListItem({ item, palette, isLast, delay }: { item: MenuItem; palette: MenuPalette; isLast: boolean; delay: number }) {
  const { accentColor, mutedText, borderColor, surfaceBg } = palette

  return (
    <div className={`mod-anim flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-opacity-50 ${!item.available ? "opacity-50" : ""}`}
      style={{ animationDelay: `${0.05 + delay * 0.04}s`, borderBottom: !isLast ? `1px solid ${borderColor}` : "none", backgroundColor: "transparent" }}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{item.name}</h3>
        {item.description && <p className="mt-0.5 text-xs line-clamp-1" style={{ color: mutedText }}>{item.description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.prepTime != null && <span className="text-[10px] rounded-md px-2 py-0.5" style={{ backgroundColor: surfaceBg, color: mutedText }}>~{item.prepTime}m</span>}
        <span className="text-sm font-bold" style={{ color: accentColor }}>S/. {item.price.toFixed(2)}</span>
      </div>
    </div>
  )
}

/* ─── Footer ─────────────────────────── */

function ModFooter({ restaurantName, description, logoUrl, categories, hours, contact, socialLinks, palette }: {
  restaurantName: string; description: string; logoUrl: string | null
  categories: MenuCategory[]; hours: MenuHours | null; contact: MenuContact | null; socialLinks: MenuSocialLinks | null
  palette: MenuPalette
}) {
  const { accentColor, mutedText, subtleText, borderColor, surfaceBg, isDark, bgColor } = palette
  const hasSocial = socialLinks && (socialLinks.facebook || socialLinks.instagram || socialLinks.tiktok || socialLinks.whatsapp)
  const hasMap = contact?.googleMapsUrl

  return (
    <footer className="border-t" style={{ borderColor, backgroundColor: isDark ? "rgba(0,0,0,0.3)" : surfaceBg }}>
      <div className="mx-auto max-w-5xl px-5 py-12 sm:py-14">
        {hasMap && (
          <div className="mod-footer mb-10 overflow-hidden rounded-2xl shadow-md">
            <iframe src={contact.googleMapsUrl} className="h-48 w-full border-0 sm:h-56" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicacion" allowFullScreen />
          </div>
        )}

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="mod-footer mod-fd1 sm:col-span-2 lg:col-span-1">
            {logoUrl ? (
              <div className="mb-4 h-12 w-12 overflow-hidden rounded-xl shadow" style={{ border: `1px solid ${borderColor}` }}>
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                <UtensilsIcon />
              </div>
            )}
            <h3 className="text-lg font-extrabold">{restaurantName}</h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: mutedText }}>{description}</p>
            {hasSocial && (
              <div className="mt-4 flex items-center gap-2">
                {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="mod-social" aria-label="Facebook"><FacebookIcon /></a>}
                {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="mod-social" aria-label="Instagram"><InstagramIcon /></a>}
                {socialLinks.tiktok && <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="mod-social" aria-label="TikTok"><TiktokIcon /></a>}
                {socialLinks.whatsapp && <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="mod-social" aria-label="WhatsApp"><WhatsAppIcon /></a>}
              </div>
            )}
          </div>

          <div className="mod-footer mod-fd2">
            <h4 className="mb-3 text-sm font-bold" style={{ color: accentColor }}>Secciones</h4>
            <ul className="space-y-2">
              <li><button className="mod-flink" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Inicio</button></li>
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.categoryId}><button className="mod-flink" onClick={() => document.getElementById(`cat-${cat.categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{cat.categoryName}</button></li>
              ))}
            </ul>
          </div>

          <div className="mod-footer mod-fd3">
            <h4 className="mb-3 text-sm font-bold" style={{ color: accentColor }}>Contacto</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-sm" style={{ color: mutedText }}>
                <MapPinIcon /><span>{contact?.address || "Visita nuestro local"}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm" style={{ color: mutedText }}>
                <PhoneIcon />{contact?.phone ? <a href={`tel:${contact.phone}`} className="mod-flink">{contact.phone}</a> : <span>Llama para reservar</span>}
              </li>
              <li className="flex items-start gap-2.5 text-sm" style={{ color: mutedText }}>
                <MailIcon />{contact?.email ? <a href={`mailto:${contact.email}`} className="mod-flink">{contact.email}</a> : <span>Escribenos</span>}
              </li>
            </ul>
          </div>

          <div className="mod-footer mod-fd4">
            <h4 className="mb-3 text-sm font-bold" style={{ color: accentColor }}>Horario</h4>
            {hours?.enabled ? (
              <ul className="space-y-1.5">
                {hours.schedule.slice(0, 5).map((day) => (
                  <li key={day.day} className="flex justify-between text-xs" style={{ color: mutedText }}>
                    <span>{day.day.slice(0, 3)}</span>
                    <span style={{ color: day.closed ? mutedText : accentColor }}>{day.closed ? "—" : `${day.open}-${day.close}`}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: mutedText }}>Consultar horarios</p>
            )}
          </div>
        </div>

        <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderColor }}>
          <p className="text-xs" style={{ color: subtleText }}>© {new Date().getFullYear()} {restaurantName}</p>
          <p className="text-xs" style={{ color: subtleText }}>Carta digital</p>
        </div>
      </div>
    </footer>
  )
}
