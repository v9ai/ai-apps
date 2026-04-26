from pybricks.hubs import EssentialHub
from pybricks.parameters import Color, Side, Axis
from pybricks.tools import wait

# IMU Quest — streaming controller for the browser game at /games/game.
# Every documented Essential Hub IMU method is exercised:
#   ready, settings, stationary, up, tilt, acceleration,
#   angular_velocity, heading, reset_heading, rotation, orientation.
# Telemetry format (one line per tick at 20 Hz):
#   T pitch roll ax ay az heading rotZ avZ up still
# Orientation is dumped roughly once a second:
#   O m00 m01 m02 m10 m11 m12 m20 m21 m22

hub = EssentialHub()

hub.imu.settings(
    angular_velocity_threshold=2.0,
    acceleration_threshold=200,
)

# Side -> small int so JS can parse without lookups.
SIDE_CODE = {
    Side.TOP: 0, Side.BOTTOM: 1,
    Side.FRONT: 2, Side.BACK: 3,
    Side.LEFT: 4, Side.RIGHT: 5,
}

# --- Calibration --------------------------------------------------------
hub.light.blink(Color.YELLOW, [200, 200])
while not hub.imu.ready():
    wait(50)
hub.light.off()

hub.light.on(Color.WHITE)
still_for = 0
while still_for < 500:
    if hub.imu.stationary():
        still_for += 50
    else:
        still_for = 0
    wait(50)

hub.imu.reset_heading(0)
hub.light.on(Color.GREEN)
print("READY")

# --- Stream loop --------------------------------------------------------
tick = 0
while True:
    pitch, roll = hub.imu.tilt()
    ax, ay, az = hub.imu.acceleration()
    heading = hub.imu.heading()
    rot_z = hub.imu.rotation(Axis.Z)
    av_z = hub.imu.angular_velocity(Axis.Z)
    up = SIDE_CODE.get(hub.imu.up(), -1)
    still = 1 if hub.imu.stationary() else 0

    print("T", pitch, roll, ax, ay, az, heading, rot_z, av_z, up, still)

    if tick % 20 == 0:
        m = hub.imu.orientation()
        print(
            "O",
            m[0][0], m[0][1], m[0][2],
            m[1][0], m[1][1], m[1][2],
            m[2][0], m[2][1], m[2][2],
        )

    # Status light gives quick visual feedback to the player.
    if still:
        hub.light.on(Color.GREEN)
    elif abs(roll) > 25 or abs(pitch) > 25:
        hub.light.on(Color.ORANGE)
    else:
        hub.light.on(Color.CYAN)

    tick += 1
    wait(50)
