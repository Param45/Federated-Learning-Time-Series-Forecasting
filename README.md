# Federated Learning Time Series Forecasting

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![PyTorch](https://img.shields.io/badge/PyTorch-CUDA_12.1-ee4c2c)
![Federated Learning](https://img.shields.io/badge/Architecture-Federated_Learning-brightgreen)

This project implements a robust **Federated Learning Time Series Forecasting** pipeline designed to predict cellular network traffic patterns. Built around the [SUPERCOM](https://supercom.cttc.es/) initiative's real-world 5G/LTE dataset, it forecasts utilization on varying urban Base Stations (BS) while maintaining decentralized data processing and data privacy.

---

## 🎯 Key Features
* **Custom Machine Learning Suite**: Implementations of multiple deep learning models designed for temporal dependencies, including CNNs, GRUs, LSTMs, AutoEncoders, and Spiking Neural Networks (SNN).
* **Federated Architecture**: Decentralized proxy servers, clients, and custom aggregation strategies.
* **Complex Data Processing**: Specialized handlers for data lags, sliding windows, and temporal cyclical features (hour/minute tracking via trigonometric transforms).
* **GPU-Accelerated**: Heavily optimized to natively harness NVIDIA CUDA for PyTorch and `snntorch` training.

---

## 📂 Repository Structure

* `dataset/` - Contains raw and processed PDCCH cellular metrics (downlink/uplink utilization, TB size, MCS) captured across multiple districts in Barcelona (e.g., *Camp Nou, El Born, Poble Sec*). See `dataset/README.md` for specific statistical skews.
* `ml/` - The core functional library.
  * `fl/` - Code to handle Federated Server/Client pipelines and proxy aggregations.
  * `models/` - PyTorch architectures (LSTM, GRU, RNN, SNN, MLP, CNN).
  * `utils/` - Intensive feature preprocessing pipelines (feature scaling, lag sequences, window generation).
* `notebooks/` - The execution engine of the project, divided into highly-structured sequential checkpoints.

---

## 🔌 Setup & Installation (Windows GPU Guide)

This project strictly relies on **GPU-enabled PyTorch**. Follow these steps to bypass CPU-only defaults.

1. **Create and Activate your Virtual Environment**
   ```powershell
   # Create isolated environment
   python -m venv flvnv
   
   # Activate it
   .\flvnv\Scripts\Activate.ps1
   ```

2. **Install GPU Support & Requirements**
   ```powershell
   # Force PIP to fetch PyTorch via the Windows CUDA channel (Highly recommended: cu121)
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

   # Install the rest of the ecosystem (pandas, scikit-learn, snntorch, etc.)
   pip install -r requirements.txt
   ```

3. **Bridge Environment to Jupyter**
   To ensure the notebooks are utilizing your exact packages, register the kernel:
   ```powershell
   pip install ipykernel
   python -m ipykernel install --user --name=fl_env --display-name "Python (FL Environment)"
   ```

---

## 🚀 Execution & Usage

Because of strict model dependency chains (loading pre-trained weights for deployment and aggregations), the analytical notebooks inside the `notebooks/` directory **must be run in sequential order**:

1. **`08.Federated_Learning_with_Testing_and_model_saving.ipynb`**
   Trains your core model architecture and checkpoints the FL weights. *(Must map kernel to "Python (FL Environment)")*.
2. **`09.Make_Predictions.ipynb`**
   Loads the generated checkpoint from `08` to generate raw sequence predictions.
3. **`10.Final_Model_Training_and_Weights_Save.ipynb`**
   Aggregates the final robust models dynamically on testing conditions.
4. **`11.Final_Model_Loading_and_csv_Gen.ipynb`**
   Renders out the final human-readable prediction logs (e.g., `ElBorn_predictions.csv`).

*Note: For the smoothest experience, completely restart your Jupyter Kernel between sequential steps if memory fragmentation occurs.*

---

## 🌍 Live Telemetry Dashboard (UI)

Because Jupyter outputs can be difficult to demonstrate to non-technical stakeholders, this repository includes a fully interactive, dark-mode `Vanilla JavaScript` Web Dashboard to visualize the Federated predictions. It features native Geo-mapping via Leaflet, automated 5G-simulation timelines, and dynamically syncs `True vs Predicted` traffic data.

### Running the Dashboard

1. **Synchronize the Datasets**  
   Because ML sliding windows construct lag sequences (offsetting array boundaries), you must perfectly align the raw `dataset/` testing files with the `notebooks/` predicted CSV outputs. Simply run the sync script:
   ```powershell
   python prepare_data.py
   ```
   *This generates clean `_dashboard.csv` files inside the `dashboard/data/` folder.*

2. **Boot the Web Server**  
   Navigate into the dashboard folder and spin up a lightweight Python HTTP server to bypass browser CORS policies:
   ```powershell
   cd dashboard
   python -m http.server 8000
   ```

3. **View the Simulation**  
   Open **http://localhost:8000** in your web browser. You can click "Start Simulation" to watch the data sequence autonomously, or manually drag the Timeline Scrubber to investigate specific historical spikes in Cellular Traffic or Resource Block allocations!
