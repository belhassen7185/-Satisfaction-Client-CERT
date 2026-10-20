// Seed data for initial app state in Vercel or local preview
export const initialDatabaseData = {
  "surveys": [
    {
      "id": "srv-admin-02",
      "title": "استبيان قياس رضا المتعاملين - مصلحة الخدمات الإدارية والاستقبال",
      "description": "تقييم جودة الاستقبال، سرعة معالجة الملفات، وضوح الإجراءات ورضا المواطنين.",
      "language": "ar",
      "status": "published",
      "category": "إدارة وخدمات عمومية",
      "targetResponses": 200,
      "createdAt": "2026-09-20T11:02:46.854Z",
      "updatedAt": "2026-10-14T09:18:51.242Z",
      "publishedAt": "2026-09-21T11:02:46.854Z",
      "responseCount": 0,
      "csatScore": 0,
      "npsScore": 0,
      "complaintQuestion": {
        "enabled": true,
        "title": "هل لديك شكوى بخصوص ملف يتعلق بخدماتنا؟ إذا كان الأمر كذلك، شاركها معنا مع توضيح مشكلتك.",
        "requireDossierNumber": false,
        "requireContactInfo": false
      },
      "questions": [
        {
          "id": "q-ar-1",
          "text": "ما هو تقييمكم لحسن الاستقبال وسرعة التوجيه عند وصولكم للمصلحة؟",
          "type": "stars",
          "required": true,
          "order": 1
        },
        {
          "id": "q-ar-2",
          "text": "هل وجدتم الوثائق والإرشادات واضحة وسهلة الفهم؟",
          "type": "single_choice",
          "required": true,
          "order": 2,
          "options": [
            {
              "id": "ar-yes",
              "label": "نعم، واضحة جداً",
              "value": "very_clear"
            },
            {
              "id": "ar-somewhat",
              "label": "إلى حد ما",
              "value": "somewhat_clear"
            },
            {
              "id": "ar-no",
              "label": "لا، غامضة ومعقدة",
              "value": "unclear"
            }
          ]
        },
        {
          "id": "q-ar-3",
          "text": "على مقياس من 0 إلى 10، ما مدى استعدادكم للتوصية بخدماتنا؟",
          "type": "nps",
          "required": true,
          "minLabel": "غير مستعد إطلاقاً",
          "maxLabel": "مستعد جداً",
          "order": 3
        },
        {
          "id": "q-ar-4",
          "text": "أي ملاحظات إضافية ترغبون في إبداءها؟",
          "type": "text",
          "required": false,
          "order": 4
        }
      ]
    }
  ],
  "submissions": [],
  "complaints": [],
  "notifications": [],
  "aiRecommendations": [],
  "whatsappConfig": {
    "enabled": true,
    "recipientPhone": "+216 95 816 888",
    "managerName": "Belhassen Bouhajja (Responsable d'astreinte)",
    "notifyOn": "urgent_and_high",
    "includeAiSummary": true,
    "includeSuggestedActions": true,
    "includeDirectLink": true,
    "customHeader": "Satisfaction Client CERT - Alerte Réclamation Critique"
  },
  "whatsappLogs": []
};
