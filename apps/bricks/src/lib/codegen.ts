import { HubType, DeviceType } from "./parser";

interface PortDevice {
  port: string;
  device: DeviceType | null;
  varName: string;
}

export function generateCode(
  hub: HubType,
  ports: PortDevice[],
  hasRemote: boolean
): string {
  const imports = new Set<string>();
  imports.add(`from pybricks.hubs import ${hub}`);

  const deviceTypes = new Set<string>();

  for (const p of ports) {
    if (p.device) {
      deviceTypes.add(p.device);
    }
  }

  if (deviceTypes.size > 0) {
    imports.add(
      `from pybricks.pupdevices import ${[...deviceTypes].join(", ")}`
    );
    imports.add(
      `from pybricks.parameters import Port, Stop, Color, Direction, Button`
    );
  } else {
    imports.add(`from pybricks.parameters import Color, Button`);
  }

  imports.add(`from pybricks.tools import wait`);

  if (hasRemote) {
    imports.add(`from pybricks.pupdevices import Remote`);
  }

  const lines: string[] = [...imports, ""];

  lines.push(`# Initialize the hub`);
  lines.push(`hub = ${hub}()`);
  lines.push("");

  for (const p of ports) {
    if (p.device) {
      lines.push(`${p.varName} = ${p.device}(Port.${p.port})`);
    }
  }

  if (ports.some((p) => p.device)) lines.push("");

  if (hasRemote) {
    lines.push(`# Connect to the remote`);
    lines.push(`remote = Remote()`);
    lines.push("");
  }

  lines.push(`# Main loop`);
  lines.push(`while True:`);

  if (hasRemote) {
    lines.push(`    pressed = remote.buttons.pressed()`);
    lines.push("");

    const motors = ports.filter(
      (p) => p.device === "Motor" || p.device === "DCMotor"
    );
    if (motors.length > 0) {
      lines.push(`    if Button.LEFT_PLUS in pressed:`);
      lines.push(`        ${motors[0].varName}.dc(75)`);
      lines.push(`    elif Button.LEFT_MINUS in pressed:`);
      lines.push(`        ${motors[0].varName}.dc(-75)`);
      lines.push(`    elif Button.LEFT in pressed:`);
      lines.push(`        ${motors[0].varName}.stop()`);
      lines.push(`    else:`);
      lines.push(`        ${motors[0].varName}.stop()`);

      if (motors.length > 1) {
        lines.push("");
        lines.push(`    if Button.RIGHT_PLUS in pressed:`);
        lines.push(`        ${motors[1].varName}.dc(75)`);
        lines.push(`    elif Button.RIGHT_MINUS in pressed:`);
        lines.push(`        ${motors[1].varName}.dc(-75)`);
        lines.push(`    elif Button.RIGHT in pressed:`);
        lines.push(`        ${motors[1].varName}.stop()`);
        lines.push(`    else:`);
        lines.push(`        ${motors[1].varName}.stop()`);
      }
    } else {
      lines.push(`    # Add your button logic here`);
      lines.push(`    pass`);
    }
  } else {
    const motors = ports.filter(
      (p) => p.device === "Motor" || p.device === "DCMotor"
    );
    if (motors.length > 0) {
      lines.push(`    ${motors[0].varName}.dc(50)`);
      lines.push(`    wait(2000)`);
      lines.push(`    ${motors[0].varName}.stop()`);
      lines.push(`    wait(1000)`);
    } else {
      lines.push(`    hub.light.on(Color.RED)`);
      lines.push(`    wait(500)`);
      lines.push(`    hub.light.on(Color.GREEN)`);
      lines.push(`    wait(500)`);
    }
  }

  lines.push("");
  lines.push(`    wait(10)`);

  return lines.join("\n");
}
