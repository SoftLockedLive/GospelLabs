"use client";

/**
 * The browser's single database and repository, created on first use so
 * that nothing touches IndexedDB during server rendering.
 */
import { GospelLabsDatabase } from "./db";
import { createInvestigationRepository, type InvestigationRepository } from "./investigation-repository";

let repository: InvestigationRepository | null = null;

export function getRepository(): InvestigationRepository {
  repository ??= createInvestigationRepository(new GospelLabsDatabase());
  return repository;
}
