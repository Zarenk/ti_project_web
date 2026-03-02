/**
 * Configuration for scraping sections of the Corte Suprema del Peru website.
 *
 * The site (pj.gob.pe) uses IBM WebSphere Portal (WPS/WCM).
 * PDFs are linked with pattern: /wps/wcm/connect/[HASH]/[FILENAME].pdf
 * Pagination uses WCM_PI query parameter for page navigation.
 */

export interface CourtSection {
  /** Display name for this section */
  name: string;
  /** Full URL of the section page (first page) */
  url: string;
  /** Category tag for classification */
  category: string;
  /** Area of law */
  area: string;
  /** Court chamber (sala) */
  chamber: string;
}

const BASE = 'https://www.pj.gob.pe/wps/wcm/connect/cij-juris/s_jurisprudencia_sistematizada/as_suprema/as_servicios';

export const COURT_SECTIONS: Record<string, CourtSection[]> = {
  'Corte Suprema': [
    // Jurisprudencia Vinculante
    {
      name: 'Jurisprudencia Vinculante - Civil',
      url: `${BASE}/as_jurisprudencia_vinculante/as_civil/`,
      category: 'VINCULANTE',
      area: 'Civil',
      chamber: 'Sala Civil',
    },
    {
      name: 'Jurisprudencia Vinculante - Civil - Plenos Casatorios',
      url: `${BASE}/as_jurisprudencia_vinculante/as_civil/as_plenos_casatorios/`,
      category: 'PLENO_CASATORIO',
      area: 'Civil',
      chamber: 'Sala Civil',
    },
    {
      name: 'Jurisprudencia Vinculante - Penal',
      url: `${BASE}/as_jurisprudencia_vinculante/as_penal/`,
      category: 'VINCULANTE',
      area: 'Penal',
      chamber: 'Sala Penal',
    },
    {
      name: 'Jurisprudencia Vinculante - Penal - Sentencias Plenarias',
      url: `${BASE}/as_jurisprudencia_vinculante/as_penal/as_sentencias_plenarias/`,
      category: 'SENTENCIA_PLENARIA',
      area: 'Penal',
      chamber: 'Sala Penal',
    },
    {
      name: 'Jurisprudencia Vinculante - Penal - Precedentes y Doctrina',
      url: `${BASE}/as_jurisprudencia_vinculante/as_penal/as_precedentes_doctrina_jurisprudencia_vinculante/`,
      category: 'PRECEDENTE',
      area: 'Penal',
      chamber: 'Sala Penal',
    },
    {
      name: 'Jurisprudencia Vinculante - Contencioso Administrativo',
      url: `${BASE}/as_jurisprudencia_vinculante/as_contencioso_administrativo/`,
      category: 'VINCULANTE',
      area: 'Contencioso Administrativo',
      chamber: 'Sala Contencioso Administrativa',
    },
    {
      name: 'Jurisprudencia Vinculante - Contencioso Administrativo - Precedentes',
      url: `${BASE}/as_jurisprudencia_vinculante/as_contencioso_administrativo/as_precedentes_vinculantes/`,
      category: 'PRECEDENTE',
      area: 'Contencioso Administrativo',
      chamber: 'Sala Contencioso Administrativa',
    },
  ],
};

/** Base URL for resolving relative PDF paths */
export const PJ_BASE_URL = 'https://www.pj.gob.pe';

/** Maximum pages to scrape per section (safety limit) */
export const MAX_PAGES_PER_SECTION = 20;
