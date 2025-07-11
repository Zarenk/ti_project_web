"use client"

export default function TopBanner() {

  const content = (
    <>
      <span className="mr-8">¡Envíos gratis por compras superiores a S/. 500!</span>
      <span className="mr-8">Visita nuestras nuevas ofertas semanales</span>
    </>
  )

  return (
    <div className="top-banner overflow-hidden">
      <div className="banner-track px-4">
        {content}
      </div>
    </div>
  )
}