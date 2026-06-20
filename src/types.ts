/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'coordinador' | 'bodeguero' | 'docente';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  specialty?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  location: {
    rack: string;    // Estantería
    shelf: string;   // Balda / Repisa
    box?: string;     // Caja (opcional)
    classroom: string; // Taller / Lab principal
  };
  category: string;  // Electrónica, Mecánica, Construcción, Herramientas, etc.
  minStock: number;  // Alerta de stock crítico
}

export interface CurricularCompetency {
  id: string;
  career: string;        // Carrera (e.g. T.N.S. en Electricidad)
  subject: string;       // Asignatura
  code: string;          // Código de asignatura (e.g. ELE-101)
  semester: string;      // Semestre (e.g., Primer Semestre)
  profileCompetency: string; // Competencia del perfil de egreso vinculada
  keyLearning: string[]; // Aprendizajes clave o unidades prácticas
}

export interface RequiredItem {
  itemId: string;
  quantityRequired: number;
}

export interface PedagogicalTraceability {
  id: string;
  labExperience: string;  // Nombre de la guía o experiencia (e.g. Mediciones de tensión)
  subjectId: string;       // ID o código de la asignatura
  description: string;     // Breve descripción pedagógica
  requiredItems: RequiredItem[]; // Insumos e instrumentos necesarios
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  user: string;
  timestamp: string;
  reason: string;
}

export interface KitRequest {
  id: string;
  labExperienceId: string;
  labExperienceName: string;
  subjectCode: string;
  requestedBy: string;
  teacherName: string;
  dateRequired: string;
  status: 'pendiente' | 'preparado' | 'entregado' | 'rechazado';
  notes?: string;
}

export interface DatabaseState {
  inventory: InventoryItem[];
  competencies: CurricularCompetency[];
  traceability: PedagogicalTraceability[];
  movements: StockMovement[];
  requests: KitRequest[];
}
