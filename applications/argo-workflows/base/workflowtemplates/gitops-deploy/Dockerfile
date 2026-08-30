FROM alpine/git:2.43.0

ARG TARGETARCH
ARG KUSTOMIZE_VERSION=5.6.0

RUN apk add --no-cache curl \
 && case "${TARGETARCH}" in \
      amd64) SHA=54e4031ddc4e7fc59e408da29e7c646e8e57b8088c51b84b3df0864f47b5148f ;; \
      arm64) SHA=ad8ab62d4f6d59a8afda0eec4ba2e5cd2f86bf1afeea4b78d06daac945eb0660 ;; \
      *) echo "unsupported arch: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
 && curl -fsSLo /tmp/kustomize.tar.gz \
      "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv${KUSTOMIZE_VERSION}/kustomize_v${KUSTOMIZE_VERSION}_linux_${TARGETARCH}.tar.gz" \
 && echo "${SHA}  /tmp/kustomize.tar.gz" | sha256sum -c - \
 && tar -xzf /tmp/kustomize.tar.gz -C /usr/local/bin \
 && rm /tmp/kustomize.tar.gz \
 && apk del curl
