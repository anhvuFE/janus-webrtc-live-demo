# Janus Gateway from the Debian package — works on amd64 and arm64 (Apple M1).
FROM debian:bookworm-slim

# The 'janus' package pulls in the gateway plus the standard plugins and
# transports (incl. VideoRoom, WebSocket, HTTP).
RUN apt-get update \
    && apt-get install -y --no-install-recommends janus ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a stable, arch-independent symlink so our jcfg folder paths are valid
# on both x86_64 and aarch64 (the package installs under /usr/lib/<triplet>/janus).
RUN ln -sfn "/usr/lib/$(uname -m)-linux-gnu/janus" /usr/lib/janus \
    && ls -la /usr/lib/janus/plugins | grep videoroom

# Our demo configuration.
COPY janus.jcfg /etc/janus/janus.jcfg
COPY janus.plugin.videoroom.jcfg /etc/janus/janus.plugin.videoroom.jcfg
COPY janus.plugin.textroom.jcfg /etc/janus/janus.plugin.textroom.jcfg
COPY janus.transport.websockets.jcfg /etc/janus/janus.transport.websockets.jcfg
COPY janus.transport.http.jcfg /etc/janus/janus.transport.http.jcfg

# 8088 HTTP API · 8188 WebSocket API · 10000-10200/udp RTP media
EXPOSE 8088 8188 10000-10200/udp

CMD ["/usr/bin/janus", "-F", "/etc/janus"]
