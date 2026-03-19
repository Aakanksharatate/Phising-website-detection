import pandas as pd
import numpy as npdir 
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier

from xgboost import XGBClassifier

# ==========================================
# STEP 1: Load Dataset
# ==========================================

data = pd.read_csv("./datasets/5.urldata.csv")

print("Dataset Loaded Successfully")
print(data.head())

# ==========================================
# STEP 2: Feature & Label Separation
# ==========================================

# Drop Domain column (string column)
data = data.drop(columns=["Domain"])

# Separate features and label
X = data.drop(columns=["Label"])
y = data["Label"]
# ==========================================
# STEP 3: Train-Test Split
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Data Split Completed")

# ==========================================
# STEP 4: Initialize Models
# ==========================================

models = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Decision Tree": DecisionTreeClassifier(),
    "Random Forest": RandomForestClassifier(),
    "SVM": SVC(),
    "MLP": MLPClassifier(max_iter=1000),
    "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='logloss')
}

results = {}

# ==========================================
# STEP 5: Train & Evaluate Models
# ==========================================

for name, model in models.items():
    print(f"\nTraining {name}...")
    
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    results[name] = accuracy
    
    print(f"{name} Accuracy: {accuracy:.4f}")
    print(classification_report(y_test, y_pred))

# ==========================================
# STEP 6: Model Comparison
# ==========================================

results_df = pd.DataFrame(results.items(), columns=["Model", "Accuracy"])
results_df = results_df.sort_values(by="Accuracy", ascending=False)

print("\nModel Comparison:")
print(results_df)

# ==========================================
# STEP 7: Save Best Model
# ==========================================

best_model_name = results_df.iloc[0]["Model"]
best_model = models[best_model_name]

joblib.dump(best_model, "best_phishing_model.joblib")

print(f"\nBest Model Saved: {best_model_name}")

print(X.columns)