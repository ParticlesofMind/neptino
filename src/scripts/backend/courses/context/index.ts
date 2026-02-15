/**
 * Context module — barrel export
 *
 * Import from here for convenience:
 *   import { courseContextService, type CourseFingerprint } from '../context';
 */

export { courseContextService, CourseContextService } from './CourseContextService';

export type {
  CourseFingerprint,
  CourseClassification,
  PedagogyCoordinates,
  PedagogyBias,
  ScheduleSummary,
  StudentSummary,
  CurriculumModuleSummary,
  CurriculumLessonSummary,
  StructureConfig,
  BlockContentAcceptance,
  ISCEDPath,
  AssetCategory,
  GradeLevel,
  Difficulty,
  BloomLevel,
  InteractivityType,
  DepthLevel,
} from './CourseFingerprint';

export {
  DEFAULT_BLOCK_ACCEPTANCE,
  classYearToGradeLevel,
  derivePedagogyBias,
  deriveDepthLevel,
  deriveApproachLabel,
} from './CourseFingerprint';
