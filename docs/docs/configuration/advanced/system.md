---
id: system
title: System
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

### Logging

#### ARC VISION `logger`

Change the default log level for troubleshooting purposes.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Logging" />.

| Field                     | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| **Logging level**         | The default log level for all modules (default: `info`) |
| **Per-process log level** | Override the log level for specific modules             |

</TabItem>
<TabItem value="yaml">

```yaml
logger:
  # Optional: default log level (default: shown below)
  default: info
  # Optional: module by module log level configuration
  logs:
    frigate.mqtt: error
```

</TabItem>
</ConfigTabs>

Available log levels are: `debug`, `info`, `warning`, `error`, `critical`

Examples of available modules are:

- `frigate.app`
- `frigate.mqtt`
- `frigate.object_detection.base`
- `detector.<detector_name>`
- `watchdog.<camera_name>`
- `ffmpeg.<camera_name>.<sorted_roles>` NOTE: All FFmpeg logs are sent as `error` level.

#### Go2RTC Logging

See [the go2rtc docs](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#module-log) for logging configuration

```yaml
go2rtc:
  streams:
    # ...
  log:
    exec: trace
```

### `environment_vars`

This section can be used to set environment variables for those unable to modify the environment of the container, like within Home Assistant OS. Docker users should set environment variables in their `docker run` command (`-e FRIGATE_MQTT_PASSWORD=secret`) or `docker-compose.yml` file (`environment:` section) instead. Note that values set here are stored in plain text in your config file, so if the goal is to keep credentials out of your configuration, use Docker environment variables or Docker secrets instead.

Variables prefixed with `FRIGATE_` can be referenced in config fields that support environment variable substitution (such as MQTT host and credentials, camera stream URLs, and ONVIF host and credentials) using the `{FRIGATE_VARIABLE_NAME}` syntax.

:::note

The `go2rtc` section is an exception. go2rtc runs as a separate process, so its stream definitions can only be substituted with variables that exist in the container's environment (set via Docker `-e`, the `environment:` section of `docker-compose.yml`, or Docker secrets). Variables defined in the `environment_vars` block above are not available to go2rtc streams. Home Assistant app users, who cannot set container environment variables, must instead put credentials directly in their go2rtc stream URLs.

:::

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Environment variables" /> to add or edit environment variables.

| Field             | Description                                               |
| ----------------- | --------------------------------------------------------- |
| **Variable name** | The environment variable name (e.g., `FRIGATE_MQTT_USER`) |
| **Value**         | The value for the variable                                |

Variables defined here can be referenced elsewhere in your configuration using the `{FRIGATE_VARIABLE_NAME}` syntax.

</TabItem>
<TabItem value="yaml">

```yaml
environment_vars:
  FRIGATE_MQTT_USER: my_mqtt_user
  FRIGATE_MQTT_PASSWORD: my_mqtt_password

mqtt:
  host: "{FRIGATE_MQTT_HOST}"
  user: "{FRIGATE_MQTT_USER}"
  password: "{FRIGATE_MQTT_PASSWORD}"
```

</TabItem>
</ConfigTabs>

#### TensorFlow Thread Configuration

If you encounter thread creation errors during classification model training, you can limit TensorFlow's thread usage:

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Environment variables" /> and add the following variables:

| Variable                          | Description                                    |
| --------------------------------- | ---------------------------------------------- |
| `TF_INTRA_OP_PARALLELISM_THREADS` | Threads within operations (`0` = use default)  |
| `TF_INTER_OP_PARALLELISM_THREADS` | Threads between operations (`0` = use default) |
| `TF_DATASET_THREAD_POOL_SIZE`     | Data pipeline threads (`0` = use default)      |

</TabItem>
<TabItem value="yaml">

```yaml
environment_vars:
  TF_INTRA_OP_PARALLELISM_THREADS: "2" # Threads within operations (0 = use default)
  TF_INTER_OP_PARALLELISM_THREADS: "2" # Threads between operations (0 = use default)
  TF_DATASET_THREAD_POOL_SIZE: "2" # Data pipeline threads (0 = use default)
```

</TabItem>
</ConfigTabs>

### `database`

Tracked object and recording information is managed in a sqlite database at `/config/frigate.db`. If that database is deleted, recordings will be orphaned and will need to be cleaned up manually. They also won't show up in the Media Browser within Home Assistant.

If you are storing your database on a network share (SMB, NFS, etc), you may get a `database is locked` error message on startup. You can customize the location of the database if necessary.

This may need to be in a custom location if network storage is used for the media folder.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Database" />.

- Set **Database path** to the custom path for the ARC VISION database file (default: `/config/frigate.db`)

</TabItem>
<TabItem value="yaml">

```yaml
database:
  path: /path/to/frigate.db
```

</TabItem>
</ConfigTabs>

### `model`

If using a custom model, the width and height will need to be specified.

Custom models may also require different input tensor formats. The colorspace conversion supports RGB, BGR, or YUV frames to be sent to the object detector. The input tensor shape parameter is an enumeration to match what specified by the model.

| Tensor Dimension | Description    |
| :--------------: | -------------- |
|        N         | Batch Size     |
|        H         | Model Height   |
|        W         | Model Width    |
|        C         | Color Channels |

| Available Input Tensor Shapes |
| :---------------------------: |
|            "nhwc"             |
|            "nchw"             |

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Detectors and model" /> and open the **Custom Model** tab to configure the model path, dimensions, and input format.

| Field                                         | Description                          |
| --------------------------------------------- | ------------------------------------ |
| **Custom object detector model path**         | Path to the custom model file        |
| **Object detection model input width**        | Model input width (default: 320)     |
| **Object detection model input height**       | Model input height (default: 320)    |
| **Advanced > Model Input Tensor Shape**       | Input tensor shape: `nhwc` or `nchw` |
| **Advanced > Model Input Pixel Color Format** | Pixel format: `rgb`, `bgr`, or `yuv` |

</TabItem>
<TabItem value="yaml">

```yaml
# Optional: model config
model:
  path: /path/to/model
  width: 320
  height: 320
  input_tensor: "nhwc"
  input_pixel_format: "bgr"
```

</TabItem>
</ConfigTabs>

#### `labelmap`

:::warning

If the labelmap is customized then the labels used for alerts will need to be adjusted as well. See [alert labels](../review.md#restricting-alerts-to-specific-labels) for more info.

:::

The labelmap can be customized to your needs. A common reason to do this is to combine multiple object types that are easily confused when you don't need to be as granular such as car/truck. By default, truck is renamed to car because they are often confused. You cannot add new object types, but you can change the names of existing objects in the model.

```yaml
model:
  labelmap:
    2: vehicle
    3: vehicle
    5: vehicle
    7: vehicle
    15: animal
    16: animal
    17: animal
```

Note that if you rename objects in the labelmap, you will also need to update your `objects -> track` list as well.

:::warning

Some labels have special handling and modifications can disable functionality.

`person` objects are associated with `face` and `amazon`

`car` objects are associated with `license_plate`, `ups`, `fedex`, `amazon`

:::

## Network Configuration

ARC VISION exposes a few networking options. IPv6 and the listen ports are set in the `networking` configuration (or from the Settings UI); more advanced changes require [customizing the bundled Nginx configuration](#customizing-the-nginx-configuration).

### Enabling IPv6

By default ARC VISION listens on IPv4 only. To also listen on IPv6 (on port `5000`, and on `8971` when TLS is configured), enable it in the `networking` configuration.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Networking" /> and enable **IPv6**.

</TabItem>
<TabItem value="yaml">

```yaml
networking:
  ipv6:
    enabled: true
```

</TabItem>
</ConfigTabs>

### Listen on different ports

You can change the ports Nginx uses for listening. The internal port (unauthenticated) and external port (authenticated) can be changed independently. You can also specify an IP address using the format `ip:port` if you wish to bind the port to a specific interface. This may be useful for example to prevent exposing the internal port outside the container.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Networking" /> to configure the listen ports.

| Field             | Description                                               |
| ----------------- | --------------------------------------------------------- |
| **Internal port** | The unauthenticated listen address/port (default: `5000`) |
| **External port** | The authenticated listen address/port (default: `8971`)   |

</TabItem>
<TabItem value="yaml">

```yaml
networking:
  listen:
    internal: 127.0.0.1:5000
    external: 8971
```

</TabItem>
</ConfigTabs>

:::warning

This setting is for advanced users. For the majority of use cases it's recommended to change the `ports` section of your Docker compose file or use the Docker `run` `--publish` option instead, e.g. `-p 443:8971`. Changing ARC VISION's ports may break some integrations.

The internal and external ports must be different port numbers, and ARC VISION will refuse to start otherwise. Requests arriving on the internal port are treated as authenticated admins, so pointing both at the same port would remove authentication from the external one.

Nginx binds these ports when it starts, so port changes only take effect after ARC VISION restarts.

:::

### Customizing the Nginx configuration

More advanced changes to ARC VISION's internal network configuration can be made by bind mounting your own `nginx.conf` into the container. For example:

```yaml
services:
  arc-vision:
    container_name: arc-vision
    ...
    volumes:
      ...
      - /path/to/your/nginx.conf:/usr/local/nginx/conf/nginx.conf
```

## Base path

By default, ARC VISION runs at the root path (`/`). However some setups require to run ARC VISION under a custom path prefix (e.g. `/ARC VISION`), especially when ARC VISION is located behind a reverse proxy that requires path-based routing.

### Set Base Path via HTTP Header

The preferred way to configure the base path is through the `X-Ingress-Path` HTTP header, which needs to be set to the desired base path in an upstream reverse proxy.

For example, in Nginx:

```
location /arc-vision {
    proxy_set_header X-Ingress-Path /arc-vision;
    proxy_pass http://arc_vision_backend;
}
```

### Set Base Path via Environment Variable

When it is not feasible to set the base path via a HTTP header, it can also be set via the `FRIGATE_BASE_PATH` environment variable in the Docker Compose file.

For example:

```
services:
  arc-vision:
    image: ghcr.io/arc-vision/arc-vision:stable
    environment:
      - FRIGATE_BASE_PATH=/arc-vision
```

This can be used for example to access ARC VISION via a Tailscale agent (https), by simply forwarding all requests to the base path (http):

```
tailscale serve --https=443 --bg --set-path /arc-vision http://localhost:5000/arc-vision
```

## Custom Dependencies

### Custom ffmpeg build

Included with ARC VISION is a build of ffmpeg that works for the vast majority of users. However, there exists some hardware setups which have incompatibilities with the included build. In this case, statically built `ffmpeg` and `ffprobe` binaries can be placed in `/config/custom-ffmpeg/bin` for ARC VISION to use.

To do this:

1. Download your ffmpeg build and uncompress it to the `/config/custom-ffmpeg` folder. Verify that both the `ffmpeg` and `ffprobe` binaries are located in `/config/custom-ffmpeg/bin`.
2. Update the `ffmpeg.path` in your ARC VISION config to `/config/custom-ffmpeg`.
3. Restart ARC VISION and the custom version will be used if the steps above were done correctly.

### Custom go2rtc version

ARC VISION currently includes go2rtc v1.9.14, there may be certain cases where you want to run a different version of go2rtc.

To do this:

1. Download the go2rtc build to the `/config` folder.
2. Rename the build to `go2rtc`.
3. Give `go2rtc` execute permission.
4. Restart ARC VISION and the custom version will be used, you can verify by checking go2rtc logs.

## Validating your config.yml file updates

When ARC VISION starts up, it checks whether your config file is valid, and if it is not, the process exits. To minimize interruptions when updating your config, you have three options -- you can edit the config via the WebUI which has built in validation, use the config API, or you can validate on the command line using the ARC VISION docker container.

### Via API

ARC VISION can accept a new configuration file as JSON at the `/api/config/save` endpoint. When updating the config this way, ARC VISION will validate the config before saving it, and return a `400` if the config is not valid.

```bash
curl -X POST http://arc_vision_host:5000/api/config/save -d @config.json
```

if you'd like you can use your yaml config directly by using [`yq`](https://github.com/mikefarah/yq) to convert it to json:

```bash
yq -o=json '.' config.yaml | curl -X POST 'http://arc_vision_host:5000/api/config/save?save_option=saveonly' --data-binary @-
```

### Via Command Line

You can also validate your config at the command line by using the docker container itself. In CI/CD, you leverage the return code to determine if your config is valid, ARC VISION will return `1` if the config is invalid, or `0` if it's valid.

```bash
docker run                                \
  -v $(pwd)/config.yml:/config/config.yml \
  --entrypoint python3                    \
  ghcr.io/arc-vision/arc-vision:stable  \
  -u -m frigate                           \
  --validate-config
```
