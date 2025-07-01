export function numeroALetrasCustom(numero: number, moneda: 'PEN' | 'USD' | 'EUR' = 'PEN'): string {
    const UNIDADES = [
      '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ',
      'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
    ];
  
    const DECENAS = [
      '', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'
    ];
  
    const CENTENAS = [
      '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
      'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
    ];
  
    function convertirMenorAMil(n: number): string {
      let letras = '';
  
      const centenas = Math.floor(n / 100);
      const decenas = Math.floor((n % 100) / 10);
      const unidades = n % 10;
      const resto = n % 100;
  
      if (n === 100) return 'CIEN';
  
      if (centenas > 0) letras += CENTENAS[centenas] + ' ';
  
      if (resto <= 20) letras += UNIDADES[resto];
      else {
        letras += DECENAS[decenas];
        if (unidades > 0) {
          if (decenas >= 3) letras += ' Y ';
          letras += UNIDADES[unidades];
        }
      }
  
      return letras.trim();
    }
  
    function convertirNumero(n: number): string {
      if (n === 0) return 'CERO';
  
      let millones = Math.floor(n / 1000000);
      let miles = Math.floor((n % 1000000) / 1000);
      let cientos = n % 1000;
  
      let partes = [];
  
      if (millones > 0) {
        partes.push(
          millones === 1 ? 'UN MILLÓN' : convertirMenorAMil(millones) + ' MILLONES'
        );
      }
  
      if (miles > 0) {
        partes.push(miles === 1 ? 'MIL' : convertirMenorAMil(miles) + ' MIL');
      }
  
      if (cientos > 0) {
        partes.push(convertirMenorAMil(cientos));
      }
  
      return partes.join(' ').trim();
    }
  
    const parteEntera = Math.floor(numero);
    const parteDecimal = Math.round((numero - parteEntera) * 100);
  
    const textoMoneda = {
      PEN: { singular: 'SOL', plural: 'SOLES' },
      USD: { singular: 'DÓLAR AMERICANO', plural: 'DÓLARES AMERICANOS' },
      EUR: { singular: 'EURO', plural: 'EUROS' },
    }[moneda] || { singular: 'MONEDA', plural: 'MONEDAS' };
  
    const letrasEntero = convertirNumero(parteEntera);
    const letrasMoneda = parteEntera === 1 ? textoMoneda.singular : textoMoneda.plural;
    const centavos = parteDecimal.toString().padStart(2, '0');
  
    return `IMPORTE EN LETRAS: ${letrasEntero} ${letrasMoneda} CON ${centavos}/100`;
  }