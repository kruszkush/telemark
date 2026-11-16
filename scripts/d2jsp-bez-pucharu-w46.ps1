# Mateusz 16.11: tydzień startu gry (w2026-46: 1 dzień, 3 osoby) bez mistrza tygodnia; punkty zostają w tabelach.
# Czyści zwycięzców i podium zapisanego pucharu na serwerze głównym (Firestore tm_puchary/std_w2026-46).
# Kopia przed zmianą: docs/kopie/puchar_w2026-46_przed_usunieciem.json. Strona pokaże zmianę po najwyżej minucie.
$t = gcloud auth print-access-token
$u = "https://firestore.googleapis.com/v1/projects/rich-chimera-344319/databases/(default)/documents/tm_puchary/std_w2026-46" +
  "?updateMask.fieldPaths=podium&updateMask.fieldPaths=zwyciezcy&updateMask.fieldPaths=anulowany"
$body = '{"fields":{"podium":{"arrayValue":{}},"zwyciezcy":{"arrayValue":{}},"anulowany":{"stringValue":"Mateusz 16.11: tydzien startu gry bez mistrza, punkty zostaja"}}}'
$r = Invoke-RestMethod -Method Patch -Uri $u -Headers @{ Authorization = "Bearer $t" } -ContentType "application/json" -Body $body
if ($r.fields.zwyciezcy.arrayValue.values) { "BLAD: zwyciezcy dalej sa" } else { "OK: puchar tygodnia 46 bez mistrza" }
