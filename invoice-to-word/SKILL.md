---
name: invoice-to-word
description: Convert invoice PDFs in a directory into a Word document with two invoices per page and spacing; use when the user asks to put invoices into Word or create an invoice attachment document.
metadata:
  short-description: Convert invoice PDFs to Word
---

# Invoice to Word

Resolve the source directory in this order:

1. If the user explicitly names a directory, use it.
2. Otherwise, if the conversation context clearly identifies a directory, use that directory.
3. Otherwise, use the current working directory.

If the source directory is ambiguous, or if it contains files that may not be invoices, ask the user to confirm before running.

Use only PDF invoices. Do not read XML or other invoice sources unless the user explicitly asks for them.

Run:

```bash
python scripts/invoices_to_word.py --source <source-dir> --output <output.docx>
```

The script renders each PDF’s first page to an image, sorts invoices by date, and writes an A4 portrait Word document with two invoices per page and about 1.5 cm spacing between them. Landscape invoices are scaled to 17.5 cm wide; portrait invoices are scaled to 12 cm high.
