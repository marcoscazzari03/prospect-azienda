import { describe, expect, it } from "vitest";
import { dropProfessionals, isProfessionalName } from "@/lib/domain/engine";

// Professionisti con titolo esclusi (24/10, analisi privacy; stessa regola della migrazione 074).
describe("professionisti con titolo", () => {
  it("riconosce titoli e professioni senza forma societaria", () => {
    for (const n of ["Avv. Mario Rossi", "Studio Arch. Bianchi", "Dott.ssa Laura Verdi", "Geom. Neri", "Ing. Paolo Blu", "Commercialista Gialli", "Dottor Rossi", "Studio Legale Associato Avv. Neri"])
      expect(isProfessionalName(n), n).toBe(true);
  });
  it("non tocca società, studi senza titolo e nomi comuni", () => {
    for (const n of ["Studio Ing. Rossi & C. S.r.l.", "Architetti Associati STP", "Studio Rossi", "Pizzeria da Mario", "Marketing Ingenium", "Drago Srl", "Ristorante Arco", "Centro Medico San Luca", "Farmacia Dr. Max", "Dr. Schär", "Ing Direct", "Hotel Arch", "Rag Doll Bar", "Perito Moreno Viaggi", "Il Tuo Dentista", "Dr Car Autofficina", "Farmacia Dott. Rossi", "Ottica Dott. Ghezzi", "Impresa Edile Geom. Bianchi", "Autofficina Ing. Verdi", "Clinica Veterinaria Dott. Bianchi", "Ristorante Dal Dottore", "Bar Il Notaio", "Dottor Gelato", "Dottor Bike", "Avvocato Express", "Geometra Facile", "Hotel Notaio", "Ing. Car Service", "Il Commercialista Digitale"])
      expect(isProfessionalName(n), n).toBe(false);
  });
  it("toglie i lead dei professionisti", () => {
    const leads = [{ company: { name: "Avv. Rossi" } }, { company: { name: "Rossi Srl" } }, {}];
    expect(dropProfessionals(leads)).toEqual([{ company: { name: "Rossi Srl" } }, {}]);
  });
});
