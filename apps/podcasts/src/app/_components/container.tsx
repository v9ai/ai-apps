import { css, cx } from "styled-system/css";

type Props = {
  children?: React.ReactNode;
  className?: string;
};

const Container = ({ children, className = "" }: Props) => {
  return (
    <div className={cx(css({ maxW: '7xl', mx: 'auto', px: '5', sm: { px: '6' }, md: { px: '8' }, lg: { px: '10' } }), className)}>
      {children}
    </div>
  );
};

export default Container;
