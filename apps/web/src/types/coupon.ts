export type DiscountType = "PERCENTAGE" | "FIXED";

export interface Coupon {
  id: string;
  tenantId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number | null;
  usedCount: number;
  expirationDate?: string | Date | null;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateCouponInput {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number | null;
  expirationDate?: string | null;
  isActive?: boolean;
}

export interface ValidateCouponResponse {
  valid: boolean;
  message?: string;
  coupon?: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    calculatedDiscount: number;
    finalTotal: number;
  };
}
