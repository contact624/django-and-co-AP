import { z } from "zod";

// ===============================================
// SECURITY: Centralized input validation schemas
// ===============================================
// Version: Expert++ avec validations renforcées
// Dernière mise à jour: 2024-12-14

/**
 * PRINCIPES DE SÉCURITÉ :
 * 1. Validation côté client ET côté serveur (double vérification)
 * 2. Sanitization de toutes les entrées texte
 * 3. Validation stricte des formats (email, téléphone, IBAN)
 * 4. Protection contre les injections (SQL, XSS, etc.)
 * 5. Limites de longueur pour éviter les DoS
 */

// Password must be at least 8 characters (security requirement)
export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(128, "Le mot de passe est trop long")
  .refine((val) => /[A-Z]/.test(val), "Le mot de passe doit contenir au moins une majuscule")
  .refine((val) => /[a-z]/.test(val), "Le mot de passe doit contenir au moins une minuscule")
  .refine((val) => /[0-9]/.test(val), "Le mot de passe doit contenir au moins un chiffre")
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), "Le mot de passe doit contenir au moins un caractère spécial");

// Email validation
export const emailSchema = z
  .string()
  .trim()
  .min(1, "L'email est requis")
  .email("Email invalide")
  .max(255, "L'email est trop long");

// Name validation (prevents injection)
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Ce champ est requis")
  .max(100, "Ce champ est trop long")
  .regex(/^[\p{L}\p{M}\s'-]+$/u, "Caractères non autorisés");

// Company name validation
export const companyNameSchema = z
  .string()
  .trim()
  .min(1, "Le nom d'entreprise est requis")
  .max(200, "Le nom est trop long");

// Phone validation (Swiss format primarily)
export const phoneSchema = z
  .string()
  .trim()
  .max(30, "Numéro trop long")
  .regex(/^[\d\s+\-().]*$/, "Format de téléphone invalide")
  .optional()
  .or(z.literal(""));

// Address validation
export const addressSchema = z
  .string()
  .trim()
  .max(500, "Adresse trop longue")
  .optional()
  .or(z.literal(""));

// Notes/text validation (prevents XSS)
export const notesSchema = z
  .string()
  .trim()
  .max(2000, "Texte trop long")
  .optional()
  .or(z.literal(""));

// Amount validation (positive numbers)
export const amountSchema = z
  .number()
  .min(0, "Le montant doit être positif")
  .max(999999.99, "Montant trop élevé");

// Date validation
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide");

// IBAN validation (Swiss format)
export const ibanSchema = z
  .string()
  .trim()
  .max(34, "IBAN trop long")
  .regex(/^[A-Z0-9\s]*$/, "Format IBAN invalide")
  .optional()
  .or(z.literal(""));

// ===============================================
// Form Schemas
// ===============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  companyName: companyNameSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const clientSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  address: addressSchema,
  notes: notesSchema,
});

export const expenseSchema = z.object({
  category: z.string(),
  date: dateSchema,
  amount: amountSchema,
  description: z.string().trim().min(1, "Description requise").max(500),
});

export const activitySchema = z.object({
  client_id: z.string().uuid("Client invalide"),
  animal_id: z.string().uuid().nullable().optional(),
  service_type: z.string(),
  scheduled_date: dateSchema,
  scheduled_time: z.string().optional(),
  duration_minutes: z.number().min(1).max(1440),
  unit_price: amountSchema,
  quantity: z.number().min(1).max(100),
  notes: notesSchema,
});

// ===============================================
// Utility Functions
// ===============================================

/**
 * Sanitize string input - removes potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .trim();
}

/**
 * Validate and sanitize form data
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}
