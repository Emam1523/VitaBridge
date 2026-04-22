class SymptomService:
    def __init__(self) -> None:
        self._specialty_keywords = {
            "Cardiologist": [
                "chest pain",
                "palpitation",
                "heart",
                "shortness of breath",
            ],
            "Neurologist": ["headache", "migraine", "dizziness", "seizure", "numbness"],
            "Dermatologist": ["rash", "skin", "itch", "acne", "eczema"],
            "ENT Specialist": ["sore throat", "ear pain", "sinus", "hearing", "nose"],
            "Pulmonologist": ["cough", "asthma", "wheezing", "breathlessness", "lung"],
            "Gastroenterologist": ["stomach", "abdominal", "vomit", "diarrhea", "constipation"],
            "Orthopedic": ["joint pain", "back pain", "knee", "bone", "fracture"],
            "Gynecologist": ["period", "pregnancy", "pelvic", "menstrual"],
            "General Physician": ["fever", "weakness", "fatigue", "cold", "body pain"],
        }

        self._emergency_keywords = [
            "severe chest pain",
            "unconscious",
            "fainting",
            "stroke",
            "cannot breathe",
            "blood vomiting",
            "heavy bleeding",
        ]

        self._disease_keywords = {
            "Flu / Viral Infection": ["fever", "cold", "body pain", "fatigue"],
            "Respiratory Infection": ["cough", "sore throat", "breathlessness"],
            "Gastritis / GI Upset": ["stomach", "abdominal", "vomit", "diarrhea"],
            "Migraine / Neuro Condition": ["headache", "migraine", "dizziness", "numbness"],
            "Cardiac Concern": ["chest pain", "palpitation", "shortness of breath"],
            "Allergic / Skin Condition": ["rash", "itch", "eczema", "acne"],
            "Musculoskeletal Condition": ["joint pain", "back pain", "knee", "bone"],
        }

    def check(self, symptoms: str) -> dict[str, str | list[str]]:
        text = symptoms.lower()
        matched_keywords: list[str] = []
        suggested_specialties: list[str] = []
        probable_diseases: list[str] = []

        for specialty, keywords in self._specialty_keywords.items():
            found = [kw for kw in keywords if kw in text]
            if found:
                suggested_specialties.append(specialty)
                matched_keywords.extend(found)

        if not suggested_specialties:
            suggested_specialties = ["General Physician"]

        for disease, keywords in self._disease_keywords.items():
            if any(kw in text for kw in keywords):
                probable_diseases.append(disease)

        if not probable_diseases:
            probable_diseases = ["General medical condition (needs clinical evaluation)"]

        urgency = "normal"
        if any(kw in text for kw in self._emergency_keywords):
            urgency = "high"

        advice = (
            "If symptoms are severe or worsening, go to emergency care immediately."
            if urgency == "high"
            else "Book an appointment with a suggested specialist for proper diagnosis."
        )

        return {
            "urgency": urgency,
            "probable_diseases": sorted(set(probable_diseases)),
            "suggested_specialties": sorted(set(suggested_specialties)),
            "matched_keywords": sorted(set(matched_keywords)),
            "advice": advice,
        }
