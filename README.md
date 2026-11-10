# Expenses

A one-page monthly budget calculator. Enter amounts by category and subcategory, see monthly and annual totals, and review the whole budget on a chart.

Open `index.html` in a browser. There is no build step and no server required.

## Features

- **Budget** — 16 categories and their subcategories, with a monthly amount and an essential mark on each line.
- **Totals** — monthly, annual (×12), essential versus discretionary, and how many lines have an amount.
- **Add a subcategory** — the **+** button adds a line to the category you have open. **×** removes a line you added.
- **Dashboard** — share ring, essential versus discretionary bar, and a bar for every category.
- **Print PDF** — from the dashboard, opens the print dialog. Choose **Save as PDF** or **Microsoft Print to PDF**. The page includes the charts, a category table, and each entered subcategory.
- **Save and Open** — write the budget to a JSON file and load that file later.
- **Light and dark** — the theme control in the header. The choice is remembered in this browser.

The current budget is also kept in the browser automatically, so it is still there the next time you open the page on the same computer.

## Categories

Home, Healthcare, Bills & utilities, Food, Auto & transport, Personal care, Family care, Travel & vacation, Entertainment, Shopping, Charity & gifts, Pets, Business & services, Cash & ATM, Fees & charges, and Custom expenses.

Custom expenses 1–6 can be renamed. Subcategories you add can be renamed too.

## Use

1. Select a category.
2. Enter a monthly amount. Check **Ess** if the cost is essential.
3. Use **+** to add a subcategory to the selected category.
4. Open **Dashboard** for the charts.
5. Use **Print PDF** on the dashboard to print or save a PDF.
6. Use **Save** to download `expenses-YYYY-MM-DD.json`. Use **Open** to load a file you saved earlier.
7. **Clear** wipes amounts in the selected category. **Clear all** resets the whole budget, including subcategories you added.

## Saved file

A saved file looks like this:

```json
{
  "app": "expenses",
  "version": 1,
  "savedAt": "2026-11-10T14:00:00.000Z",
  "selected": "home",
  "amounts": {},
  "essential": {},
  "names": {},
  "added": {}
}
```

`amounts` holds monthly dollars by subcategory id. `essential` marks essential lines. `names` holds renamed custom expenses. `added` holds subcategories you created. Opening a file that is not an expense budget leaves the budget on screen unchanged.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | Layout, theme, and print styles |
| `app.js` | Categories, totals, dashboard, save, and open |

## Browser notes

Works in current Chrome, Edge, and Firefox. **Save** downloads a JSON file. **Open** reads a JSON file you choose. **Print PDF** uses the browser print dialog.
