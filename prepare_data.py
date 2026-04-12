import pandas as pd
import os

cities = ["ElBorn", "LesCorts", "PobleSec"]
output_dir = "dashboard/data"
os.makedirs(output_dir, exist_ok=True)

for city in cities:
    test_path = f"dataset/{city}_test.csv"
    pred_path = f"notebooks/{city}_predictions.csv"
    
    if not os.path.exists(test_path) or not os.path.exists(pred_path):
        print(f"Skipping {city}, files missing.")
        continue

    # Load data
    df_test = pd.read_csv(test_path)
    df_pred = pd.read_csv(pred_path)
    
    # Target columns to map
    # true fields: 'time', 'down', 'up', 'rnti_count', 'rb_down', 'rb_up'
    # pred fields: 'down', 'up', 'rnti_count', 'rb_down', 'rb_up'
    
    n_preds = len(df_pred)
    n_tests = len(df_test)
    
    # predictions perfectly align with the tail of the test set
    df_true = df_test.tail(n_preds).reset_index(drop=True)
    
    # Build unified dataframe
    fused_df = pd.DataFrame()
    if 'time' in df_true.columns:
        fused_df['time'] = df_true['time']
    else:
        fused_df['time'] = df_true.index
        
    fused_df['true_down'] = df_true['down']
    fused_df['pred_down'] = df_pred['down']
    
    fused_df['true_up'] = df_true['up']
    fused_df['pred_up'] = df_pred['up']
    
    fused_df['true_rnti'] = df_true['rnti_count']
    fused_df['pred_rnti'] = df_pred['rnti_count']
    
    fused_df['true_rb_down'] = df_true['rb_down']
    fused_df['pred_rb_down'] = df_pred['rb_down']
    
    fused_df['true_rb_up'] = df_true['rb_up']
    fused_df['pred_rb_up'] = df_pred['rb_up']
    
    out_path = os.path.join(output_dir, f"{city}_dashboard.csv")
    fused_df.to_csv(out_path, index=False)
    print(f"[{city}] Merged {n_preds} rows successfully. Output: {out_path}")
