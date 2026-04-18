# LEGO Education SPIKE Essential — Unit 4 Lesson 6
# Crazy Carnival Games: Junior Pinball
#
# Sofie's junior pinball game. Converts potential energy (stored in
# the motor-cocked launcher) into kinetic energy (the ball).
# Press the hub button or bring a color card near the sensor to launch.
# Each launch uses a randomized power/duration so the game feels
# unpredictable — just like a real pinball machine.

from pybricks.hubs import EssentialHub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Color, Direction, Button
from pybricks.tools import wait
from urandom import randint

hub = EssentialHub()

# Port A: launcher motor (pulls back the flipper, then releases)
# Port B: color sensor — a colored card triggers a launch
launcher = Motor(Port.A, Direction.CLOCKWISE)
sensor = None
try:
    sensor = ColorSensor(Port.B)
    sensor.detectable_colors([Color.RED, Color.YELLOW, Color.GREEN, Color.NONE])
except OSError:
    sensor = None

# Launch tuning — students change these to modify behaviour
COCK_ANGLE = 120           # how far the launcher is pulled back (degrees)
MIN_LAUNCH_SPEED = 400     # minimum release speed (deg/s)
MAX_LAUNCH_SPEED = 1100    # maximum release speed (deg/s)
RESET_SPEED = 250          # speed to re-cock the launcher

hub.light.on(Color.WHITE)


def launch():
    # Pull back to store potential energy
    launcher.run_angle(RESET_SPEED, -COCK_ANGLE)
    wait(200)

    # Randomize the release → unpredictable kinetic energy transfer
    power = randint(MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED)
    hub.light.on(Color.RED)
    launcher.run_angle(power, COCK_ANGLE)
    hub.light.on(Color.GREEN)
    wait(400)
    hub.light.on(Color.WHITE)


while True:
    # Trigger 1 — center hub button
    if Button.CENTER in hub.buttons.pressed():
        launch()
        # wait for release to avoid repeat triggers
        while Button.CENTER in hub.buttons.pressed():
            wait(20)

    # Trigger 2 — a colored card near the sensor
    if sensor is not None:
        color = sensor.color()
        if color == Color.GREEN:
            launch()
        elif color == Color.RED:
            # Obstacle/tilt card — brief pause, no launch
            hub.light.on(Color.YELLOW)
            wait(600)
            hub.light.on(Color.WHITE)

    wait(30)
