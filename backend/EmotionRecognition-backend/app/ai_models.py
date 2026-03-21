import torch
import numpy as np
import pandas as pd
import torch.nn as nn
from transformers import BertTokenizer, BertModel, BertForMaskedLM, BertForQuestionAnswering
import matplotlib.pyplot as plt

import torchvision.models as models
from torchvision import transforms
from PIL import Image

import io
import os
import tempfile
import opensmile
import librosa
import joblib

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.cuda.is_available()

#Load values from pretrained model
textCheckpoint = torch.load("../languageModel/combined_model.pth", map_location=device)
emotionsList = ["sadness", "joy", "love", "anger", "fear", "surprise"]
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

bert = BertModel.from_pretrained("bert-base-uncased")
bert.to(device)

classifier = nn.Sequential(
    nn.Linear(bert.config.hidden_size, 256),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(256, len(emotionsList)))
classifier.to(device)

bert.load_state_dict(textCheckpoint["bert_state_dict"])
classifier.load_state_dict(textCheckpoint["classifier_state_dict"])

bert.to(device)
classifier.to(device)

def predict_emotion_text(text):
    # Set to evaluation mode
    bert.eval()
    classifier.eval()

    # Disable gradient calculation for faster inference
    with torch.no_grad():
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=64)

        # Move inputs to device
        input_ids = inputs["input_ids"].to(device)
        attention_mask = inputs["attention_mask"].to(device)

        outputs = bert(input_ids, attention_mask)
        logits = classifier(outputs.pooler_output)

        pred = torch.argmax(logits, dim=1).item()
        prob = torch.softmax(logits, dim=1)

    return emotionsList[pred], prob.squeeze().cpu().numpy()

num_classes = 7
IMAGE_EMOTION_LABELS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

class FERResNet(nn.Module):
    """
    ResNet18 backbone with a custom emotion classification head.
    Dropout added for regularization on the small FER dataset.
    """
    def __init__(self, num_classes=7, dropout=0.4, freeze_until_layer=None):
        super().__init__()
        # Pretrained ResNet18 backbone
        base = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)

        # freeze early layers (useful for fine-tuning on CK+)
        if freeze_until_layer:
            layers_to_freeze = ['conv1', 'bn1', 'layer1', 'layer2']
            for name, param in base.named_parameters():
                if any(name.startswith(l) for l in layers_to_freeze[:freeze_until_layer]):
                    param.requires_grad = False

        in_features = base.fc.in_features
        base.fc = nn.Identity()        # Remove original classifier
        self.backbone = base

        # Custom emotion head
        self.classifier = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout * 0.5),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.classifier(features)

    def get_trainable_params(self):
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        total     = sum(p.numel() for p in self.parameters())
        print(f'Trainable params: {trainable:,} / {total:,} ({100*trainable/total:.1f}%)')



model = FERResNet(num_classes=num_classes).to(device)
ckpt  = torch.load("../facialModel/fer_ck_finetuned_inference.pth", map_location=device)
model.load_state_dict(ckpt['model_state_dict'])
model.eval()

val_transform = transforms.Compose([
    transforms.Resize((48, 48)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

@torch.no_grad()
def predict_face(image_bytes):

    model.eval()

    if image_bytes is None:
        raise ValueError("image_bytes is required")

    image = Image.open(io.BytesIO(image_bytes))
    if image.mode != "RGB":
        image = image.convert("RGB")
    image = val_transform(image)
    image = image.unsqueeze(0).to(device)  # add batch dimension

    outputs = model(image)

    probs = torch.softmax(outputs, dim=1)
    predicted_class = torch.argmax(probs, dim=1).item()

    print(probs)

    return IMAGE_EMOTION_LABELS[predicted_class], probs.squeeze().cpu().numpy()

audio_target_emotions = ["Anger", "Disgust", "Fear", "Happy", "Neutral", "Sad"]

# CNN model definition 
class AudioEmotionCNN2D(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.bn1   = nn.BatchNorm2d(32)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2   = nn.BatchNorm2d(64)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3   = nn.BatchNorm2d(128)
        self.pool  = nn.MaxPool2d(2, 2)
        self.drop  = nn.Dropout(0.5)
        self.fc1   = nn.Linear(128 * 16 * 21, 256)
        self.fc2   = nn.Linear(256, num_classes)

    def forward(self, x):
        x = x.unsqueeze(1)
        x = self.pool(torch.relu(self.bn1(self.conv1(x))))
        x = self.pool(torch.relu(self.bn2(self.conv2(x))))
        x = self.pool(torch.relu(self.bn3(self.conv3(x))))
        x = torch.flatten(x, 1)
        x = torch.relu(self.fc1(x))
        x = self.drop(x)
        return self.fc2(x)

cnn = AudioEmotionCNN2D(num_classes=len(audio_target_emotions)).to(device)

cnn.load_state_dict(torch.load("../audioModel/audio_model_cnn.pth", map_location=device))

W_CNN = 0.60
W_SVM = 0.40

svm = joblib.load("../audioModel/svm_model_for_fusion.joblib")

TRAINED_COLS = None
if hasattr(svm, "named_steps") and "scaler" in svm.named_steps and hasattr(svm.named_steps["scaler"], "feature_names_in_"):
    TRAINED_COLS = list(svm.named_steps["scaler"].feature_names_in_)
elif hasattr(svm, "feature_names_in_"):
    TRAINED_COLS = list(svm.feature_names_in_)

if TRAINED_COLS is None:
    raise ValueError("Cannot find feature_names_in_ in SVM pipeline. Re-save/retrain SVM with stable schema.")

smile = opensmile.Smile(
    feature_set=opensmile.FeatureSet.ComParE_2016,
    feature_level=opensmile.FeatureLevel.Functionals,
)

def extract_opensmile_features(paths):
    rows, good_paths = [], []
    failed = 0
    for p in paths:
        try:
            feats = smile.process_file(str(p)).reset_index(drop=True)
            rows.append(feats.iloc[0])
            good_paths.append(p)
        except Exception:
            failed += 1
    if not rows:
        raise ValueError("No valid files for OpenSMILE.")
    return pd.DataFrame(rows), good_paths, failed

# CNN feature extraction
def wav_to_logmel(path, duration=3.0, sr=22050, n_mels=128, frames=174, n_fft=1024):
    y, _ = librosa.load(str(path), duration=duration, sr=sr)

    # avoid librosa warning on short signals
    if len(y) < n_fft:
        y = np.pad(y, (0, n_fft - len(y)), mode="constant")

    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels, n_fft=n_fft)
    log_mel = librosa.power_to_db(mel, ref=np.max)

    # normalize 0..1
    log_mel = (log_mel - log_mel.min()) / (log_mel.max() - log_mel.min() + 1e-6)

    # pad/truncate time frames
    if log_mel.shape[1] < frames:
        log_mel = np.pad(log_mel, ((0, 0), (0, frames - log_mel.shape[1])), mode="constant")
    else:
        log_mel = log_mel[:, :frames]

    return log_mel.astype(np.float32)

def align_opensmile_columns(X_svm: pd.DataFrame) -> pd.DataFrame:
    # schema diagnostics
    missing_cols = [c for c in TRAINED_COLS if c not in X_svm.columns]
    extra_cols   = [c for c in X_svm.columns if c not in TRAINED_COLS]

    print("\nFeature schema check:")
    print("Current extracted cols:", X_svm.shape[1])
    print("Trained cols:", len(TRAINED_COLS))
    print("Missing cols:", len(missing_cols))
    print("Extra cols:", len(extra_cols))

    return X_svm.reindex(columns=TRAINED_COLS, fill_value=0.0)

# SVM classes
if hasattr(svm, "classes_"):
    svm_classes = list(svm.classes_)
elif hasattr(svm, "named_steps") and "clf" in svm.named_steps and hasattr(svm.named_steps["clf"], "classes_"):
    svm_classes = list(svm.named_steps["clf"].classes_)
else:
    raise ValueError("Can't find SVM classes_ inside joblib.")


SPLIT_DIR   = "splits_speaker_safe"
# CNN_LE_PATH = os.path.join(SPLIT_DIR, "../audioModel/label_encoder.joblib")
le = joblib.load("../audioModel/label_encoder.joblib")
cnn_classes = list(le.classes_)

# svm_to_cnn_idx = [svm_classes.index(c) for c in cnn_classes]
svm_to_cnn_idx = [0,1,2,3,4,5]



@torch.no_grad()
def predict_audio_file(audio_bytes, w_cnn=W_CNN, w_svm=W_SVM):
  
    # Run ONE audio bytes blob through:
    # - CNN (log-mel spectrogram)
    # - OpenSMILE + SVM
    # - Weighted ensemble
    # Returns:
    #     final_label,
    #     ensemble_probs,
    #     cnn_probs,
    #     svm_probs
    

    if audio_bytes is None:
        raise ValueError("audio_bytes is required")

    tmp_path = None

    # --------------------
    # 1) CNN Prediction
    # --------------------
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=".wav")
        with os.fdopen(fd, "wb") as tmp_file:
            tmp_file.write(audio_bytes)

        logmel = wav_to_logmel(tmp_path)
        x = torch.tensor(logmel, dtype=torch.float32).unsqueeze(0).to(device)
        logits = cnn(x)
        cnn_probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

        # --------------------
        # 2) SVM Prediction
        # --------------------
        try:
            X_svm, good_paths, failed = extract_opensmile_features([tmp_path])

            if len(good_paths) == 0:
                raise ValueError("OpenSMILE failed on this file.")

            X_svm = align_opensmile_columns(X_svm)
            svm_probs = svm.predict_proba(X_svm)
            svm_probs = svm_probs[:, svm_to_cnn_idx][0]

        except Exception as e:
            print("SVM failed, falling back to CNN only:", e)
            svm_probs = np.zeros_like(cnn_probs)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    # --------------------
    # 3) Weighted Fusion
    # --------------------
    ensemble_probs = (w_cnn * cnn_probs) + (w_svm * svm_probs)
    ensemble_probs = ensemble_probs / (ensemble_probs.sum() + 1e-12)

    pred_idx = np.argmax(ensemble_probs)
    pred_label = audio_target_emotions[pred_idx]

    return pred_label, ensemble_probs, cnn_probs, svm_probs

# ---- Multimodal fusion (audio + video + text) ----
FUSION_LABELS = ["Anger", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise", "Love"]

# Map each modality label set to the fusion label space
TEXT_TO_FUSION = {
    "sadness": "Sad",
    "joy": "Happy",
    "love": "Love",
    "anger": "Anger",
    "fear": "Fear",
    "surprise": "Surprise",
}
FACE_TO_FUSION = {
    "Angry": "Anger",
    "Disgust": "Disgust",
    "Fear": "Fear",
    "Happy": "Happy",
    "Sad": "Sad",
    "Surprise": "Surprise",
    "Neutral": "Neutral",
}
AUDIO_TO_FUSION = {lbl: lbl for lbl in audio_target_emotions}

def _project_probs_to_fusion(src_probs, src_labels, label_map):
    vec = torch.zeros(len(FUSION_LABELS), dtype=torch.float32)
    for i, lbl in enumerate(src_labels):
        if lbl in label_map:
            fusion_lbl = label_map[lbl]
            if fusion_lbl in FUSION_LABELS:
                j = FUSION_LABELS.index(fusion_lbl)
                vec[j] += float(src_probs[i])
    s = vec.sum()
    if s > 0:
        vec = vec / s
    return vec

class FusionHead(nn.Module):
    def __init__(self, w_text=0.9, w_video=0.6, w_audio=0.6):
        super().__init__()
        w = torch.tensor([w_text, w_video, w_audio], dtype=torch.float32)
        w = w / w.sum()
        self.register_buffer("weights", w)

    def forward(self, text_vec, video_vec, audio_vec):
        stacked = torch.stack([text_vec, video_vec, audio_vec], dim=0)
        fused = (self.weights[:, None] * stacked).sum(dim=0)
        fused = fused / (fused.sum() + 1e-12)
        return fused

fusion_head = FusionHead(w_text=0.8, w_video=0.6, w_audio=0.6)

@torch.no_grad()
def predict_fusion(text, image_bytes, audio_bytes):
    # text
    _, text_probs = predict_emotion_text(text)
    text_vec = _project_probs_to_fusion(text_probs, emotionsList, TEXT_TO_FUSION)

    # video (single frame image)
    _, face_probs = predict_face(image_bytes)
    face_vec = _project_probs_to_fusion(face_probs, IMAGE_EMOTION_LABELS, FACE_TO_FUSION)

    # audio
    _, audio_probs, _, _ = predict_audio_file(audio_bytes)
    audio_vec = _project_probs_to_fusion(audio_probs, audio_target_emotions, AUDIO_TO_FUSION)

    fused = fusion_head(text_vec, face_vec, audio_vec)
    pred_idx = int(torch.argmax(fused).item())
    pred_label = FUSION_LABELS[pred_idx]
    return pred_label, fused.cpu().numpy()
