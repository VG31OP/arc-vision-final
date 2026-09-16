import hashlib
import json
import logging
import os
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.fields import PrivateAttr

from frigate.const import DEFAULT_ATTRIBUTE_LABEL_MAP, MODEL_CACHE_DIR
from frigate.util.builtin import generate_color_palette, load_labels

logger = logging.getLogger(__name__)


class PixelFormatEnum(str, Enum):
    rgb = "rgb"
    bgr = "bgr"
    yuv = "yuv"


class InputTensorEnum(str, Enum):
    nchw = "nchw"
    nhwc = "nhwc"
    hwnc = "hwnc"
    hwcn = "hwcn"


class InputDTypeEnum(str, Enum):
    float = "float"
    float_denorm = "float_denorm"  # non-normalized float
    int = "int"


class ModelTypeEnum(str, Enum):
    dfine = "dfine"
    rfdetr = "rfdetr"
    ssd = "ssd"
    yolox = "yolox"
    yolonas = "yolonas"
    yologeneric = "yolo-generic"


class ModelConfig(BaseModel):
    path: str | None = Field(
        None,
        title="Custom object detector model path",
        description="Path to a custom detection model file.",
    )
    labelmap_path: str | None = Field(
        None,
        title="Label map for custom object detector",
        description="Path to a labelmap file that maps numeric classes to string labels for the detector.",
    )
    width: int = Field(
        default=320,
        title="Object detection model input width",
        description="Width of the model input tensor in pixels.",
    )
    height: int = Field(
        default=320,
        title="Object detection model input height",
        description="Height of the model input tensor in pixels.",
    )
    labelmap: dict[int, str] = Field(
        default_factory=dict,
        title="Labelmap customization",
        description="Overrides or remapping entries to merge into the standard labelmap.",
    )
    attributes_map: dict[str, list[str]] = Field(
        default=DEFAULT_ATTRIBUTE_LABEL_MAP,
        title="Map of object labels to their attribute labels",
        description="Mapping from object labels to attribute labels used to attach metadata (for example 'car' -> ['license_plate']).",
    )
    input_tensor: InputTensorEnum = Field(
        default=InputTensorEnum.nhwc,
        title="Model Input Tensor Shape",
        description="Tensor format expected by the model: 'nhwc' or 'nchw'.",
    )
    input_pixel_format: PixelFormatEnum = Field(
        default=PixelFormatEnum.rgb,
        title="Model Input Pixel Color Format",
        description="Pixel colorspace expected by the model: 'rgb', 'bgr', or 'yuv'.",
    )
    input_dtype: InputDTypeEnum = Field(
        default=InputDTypeEnum.int,
        title="Model Input D Type",
        description="Data type of the model input tensor (for example 'float32').",
    )
    model_type: ModelTypeEnum = Field(
        default=ModelTypeEnum.ssd,
        title="Object Detection Model Type",
        description="Detector model architecture type (ssd, yolox, yolonas, yolo-generic, rfdetr, dfine) used by some detectors for optimization.",
    )
    _merged_labelmap: dict[int, str] | None = PrivateAttr()
    _colormap: dict[int, tuple[int, int, int]] = PrivateAttr()
    _all_attributes: list[str] = PrivateAttr()
    _all_attribute_logos: list[str] = PrivateAttr()
    _model_hash: str = PrivateAttr()

    @property
    def merged_labelmap(self) -> dict[int, str]:
        return self._merged_labelmap

    @property
    def colormap(self) -> dict[int, tuple[int, int, int]]:
        return self._colormap

    @property
    def non_logo_attributes(self) -> list[str]:
        return ["face", "license_plate"]

    @property
    def all_attributes(self) -> list[str]:
        return self._all_attributes

    @property
    def all_attribute_logos(self) -> list[str]:
        return self._all_attribute_logos

    @property
    def model_hash(self) -> str:
        return self._model_hash

    def __init__(self, **config):
        super().__init__(**config)

        self._merged_labelmap = {
            **load_labels(config.get("labelmap_path", "/labelmap.txt")),
            **config.get("labelmap", {}),
        }
        self._colormap = {}

        # generate list of attribute labels
        unique_attributes = set()

        for attributes in self.attributes_map.values():
            unique_attributes.update(attributes)

        self._all_attributes = list(unique_attributes)
        self._all_attribute_logos = list(
            unique_attributes - set(self.non_logo_attributes)
        )

    def compute_model_hash(self) -> None:
        if not self.path or not os.path.exists(self.path):
            self._model_hash = hashlib.md5(b"unknown").hexdigest()
        else:
            with open(self.path, "rb") as f:
                file_hash = hashlib.md5()
                while chunk := f.read(8192):
                    file_hash.update(chunk)
            self._model_hash = file_hash.hexdigest()

    def create_colormap(self, enabled_labels: set[str]) -> None:
        """Get a list of colors for enabled labels that aren't attributes."""
        enabled_trackable_labels = list(
            filter(lambda label: label not in self._all_attributes, enabled_labels)
        )
        colors = generate_color_palette(len(enabled_trackable_labels))
        self._colormap = {
            label: color for label, color in zip(enabled_trackable_labels, colors)
        }

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class BaseDetectorConfig(BaseModel):
    # the type field must be defined in all subclasses
    type: str = Field(
        default="cpu",
        title="Detector Type",
        description="Type of detector to use for object detection (for example 'cpu', 'edgetpu', 'openvino').",
    )
    model: ModelConfig | None = Field(
        default=None,
        title="Detector specific model configuration",
        description="Detector-specific model configuration options (path, input size, etc.).",
    )
    model_path: str | None = Field(
        default=None,
        title="Detector specific model path",
        description="File path to the detector model binary if required by the chosen detector.",
    )
    model_config = ConfigDict(
        extra="allow", arbitrary_types_allowed=True, protected_namespaces=()
    )
