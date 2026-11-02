export interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onBack: () => void;
  onClose: () => void;
}
