import { Injectable, Logger } from '@nestjs/common';

export interface ProductInvestmentData {
  productId: number;
  name: string;
  sku?: string;
  avgSalePrice: number;
  avgPurchasePrice: number;
  unitsSold: number;
  currentStock: number;
  daysAnalyzed: number;
}

export interface InvestmentRecommendation {
  productId: number;
  name: string;
  sku?: string;
  score: number;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  profitMargin: number;
  rotationSpeed: number;
  stockLevel: number;
  reason: string;
}

@Injectable()
export class InvestmentRecommendationService {
  private readonly logger = new Logger(InvestmentRecommendationService.name);

  /**
   * Calcula el score de inversión para un producto
   * Score = Margen de utilidad × Velocidad de rotación × Factor de stock
   * @param product Datos del producto
   * @returns Score de 0 a 100
   */
  calculateInvestmentScore(product: ProductInvestmentData): number {
    try {
      // Evitar división por cero
      if (product.avgPurchasePrice === 0 || product.daysAnalyzed === 0) {
        return 0;
      }

      // Margen de utilidad (porcentaje)
      const profitMargin =
        (product.avgSalePrice - product.avgPurchasePrice) /
        product.avgPurchasePrice;

      // Velocidad de rotación (unidades por día)
      const rotationSpeed = product.unitsSold / product.daysAnalyzed;

      // Score base: margen × rotación × 100
      const baseScore = profitMargin * rotationSpeed * 100;

      // Factor de ajuste por nivel de stock
      let stockFactor = 1.0;
      if (product.currentStock < 10) {
        stockFactor = 1.2; // Stock bajo → prioridad alta
      } else if (product.currentStock > 100) {
        stockFactor = 0.8; // Stock alto → menor prioridad
      }

      // Score final (0-100)
      const finalScore = baseScore * stockFactor;

      return Math.min(100, Math.max(0, finalScore));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error calculando score para producto ${product.productId}: ${message}`,
      );
      return 0;
    }
  }

  /**
   * Determina la prioridad basada en el score
   */
  getPriority(score: number): 'ALTA' | 'MEDIA' | 'BAJA' {
    if (score >= 70) return 'ALTA';
    if (score >= 40) return 'MEDIA';
    return 'BAJA';
  }

  /**
   * Genera una razón/justificación para la recomendación
   */
  private generateReason(
    product: ProductInvestmentData,
    score: number,
    profitMargin: number,
    rotationSpeed: number,
  ): string {
    const reasons: string[] = [];

    // Margen
    if (profitMargin > 0.5) {
      reasons.push('Alto margen de utilidad');
    } else if (profitMargin > 0.2) {
      reasons.push('Buen margen de utilidad');
    } else if (profitMargin < 0.1) {
      reasons.push('Margen bajo');
    }

    // Rotación
    if (rotationSpeed > 5) {
      reasons.push('Rotación muy rápida');
    } else if (rotationSpeed > 2) {
      reasons.push('Buena rotación');
    } else if (rotationSpeed < 0.5) {
      reasons.push('Rotación lenta');
    }

    // Stock
    if (product.currentStock < 10) {
      reasons.push('Stock bajo - requiere reposición');
    } else if (product.currentStock > 100) {
      reasons.push('Stock elevado');
    }

    if (reasons.length === 0) {
      return score >= 40 ? 'Producto balanceado' : 'Considerar con precaución';
    }

    return reasons.join(', ');
  }

  /**
   * Genera recomendaciones de inversión para una lista de productos
   * @param products Array de datos de productos
   * @returns Array de recomendaciones ordenadas por score descendente
   */
  generateRecommendations(
    products: ProductInvestmentData[],
  ): InvestmentRecommendation[] {
    const recommendations = products.map((product) => {
      const score = this.calculateInvestmentScore(product);
      const priority = this.getPriority(score);

      const profitMargin =
        product.avgPurchasePrice > 0
          ? (product.avgSalePrice - product.avgPurchasePrice) /
            product.avgPurchasePrice
          : 0;

      const rotationSpeed =
        product.daysAnalyzed > 0
          ? product.unitsSold / product.daysAnalyzed
          : 0;

      const reason = this.generateReason(
        product,
        score,
        profitMargin,
        rotationSpeed,
      );

      return {
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        score: Math.round(score * 100) / 100,
        priority,
        profitMargin: Math.round(profitMargin * 10000) / 100, // Porcentaje con 2 decimales
        rotationSpeed: Math.round(rotationSpeed * 100) / 100,
        stockLevel: product.currentStock,
        reason,
      };
    });

    // Ordenar por score descendente
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Filtra las mejores recomendaciones (score >= 40)
   */
  getTopRecommendations(
    products: ProductInvestmentData[],
    limit: number = 10,
  ): InvestmentRecommendation[] {
    const all = this.generateRecommendations(products);
    return all.filter((r) => r.score >= 40).slice(0, limit);
  }
}
