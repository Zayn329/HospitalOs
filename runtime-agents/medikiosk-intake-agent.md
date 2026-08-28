# MediKiosk Intake Intelligence Agent Specification

## 1. Agent Overview & Purpose
The **MediKiosk Intake Intelligence Agent** acts as an empathetic, multilingual clinical intake assistant. It conducts conversational history taking with patients before they enter the consultation room, digitizes paper medical records via OCR, flags emergency red flags, and prepares a structured draft SOAP summary for the treating doctor.

---

## 2. Core Capabilities & Skill Matrix

### A. Conversational History Taking (SOCRATES & AYUSH)
* **SOCRATES Framework (Allopathy):**
  * **Site:** Exact pain/symptom anatomical location.
  * **Onset:** Sudden vs gradual start.
  * **Character:** Crushing, sharp, dull, burning.
  * **Radiation:** Spread to jaw, arm, back.
  * **Associations / Severity:** Concomitant symptoms & 1-10 pain score.
* **Dashavidha Pariksha (AYUSH / Ayurveda):**
  * Evaluates *Prakriti* (Vata/Pitta/Kapha), *Vikriti*, *Agni* (digestive fire), *Koshtha* (bowel habits), and *Ahara-Vihara* (dietary & lifestyle patterns).

### B. Emergency Red-Flag Detection Protocol
* Instantly scans incoming patient descriptions for life-threatening conditions:
  * **Cardiac:** Chest pain, radiation to arm/jaw, severe shortness of breath.
  * **Neurological:** Sudden numbness, slurred speech, acute paralysis, loss of consciousness.
  * **Hemorrhage:** Uncontrolled bleeding, hematemesis, hemoptysis.
* Immediately generates urgent triage notifications and escalates queue priority.

### C. Multilingual & Audio Consent Engine
* Offers audio prompts in Hindi, English, and regional Indian languages.
* Captures explicit consent compliant with DPDP Act 2023 and ABDM framework.

### D. Document Digitization & OCR Pipeline
* Auto-extracts handwritten and printed prescriptions/lab reports.
* Normalizes lab values against reference ranges and highlights abnormal flags.

---

## 3. Operational Tool Interfaces (API Schema)

```typescript
interface MediKioskAgentTools {
  startSession(params: { language: string; mode: 'allopathy' | 'ayush'; abhaId?: string }): Promise<SessionStartResult>;
  recordConsent(sessionId: string): Promise<ConsentResult>;
  getAdaptiveQuestions(sessionId: string, chiefComplaint: string): Promise<QuestionsResult>;
  processOCRDocument(sessionId: string, docData: OCRUploadPayload): Promise<OCRResult>;
  generateDoctorSummary(sessionId: string): Promise<BilingualSOAPSummary>;
  wipeSession(sessionId: string): Promise<{ success: boolean }>;
}
```

---

## 4. Safety & Privacy Guardrails
1. **Draft Status:** All generated summaries are explicitly marked as *Draft - Requires Physician Review & Signature*.
2. **Ephemeral Memory Storage:** Patient session data MUST be automatically wiped from temporary storage upon submission (`DELETE /api/v1/medikiosk/session/:id`).
3. **Consent Mandatory:** No medical history or document processing occurs without explicit consent recorded.
