import pandas as pd

try:
    df = pd.read_excel('nightlife_filtered.xlsx')
    print("Columns:", df.columns.tolist())
    print("First 2 rows:")
    print(df.head(2).to_dict('records'))
except Exception as e:
    print(f"Error: {e}")
