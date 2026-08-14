// src/components/base/DateField.tsx
import React, { useState } from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconCalendar } from '@/components/icons';
import { Calendar } from '@/components/base/Calendar';
import { Button } from '@/components/base/Button';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';

type DateFieldProps = {
  label?: string;
  value: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  maxDate?: string;
  minDate?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * Input과 같은 자리에 쓰되, 탭하면 텍스트 키보드 대신 Calendar를 모달로 띄웁니다.
 * 형식 오류(YYYY-MM-DD 아닌 값)가 애초에 생길 수 없어서, 사용하는 화면에서
 * 형식 검증 로직을 따로 둘 필요가 없습니다 — maxDate/minDate로 범위만 막으면 됩니다.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = '날짜 선택',
  maxDate,
  minDate,
  error,
  style,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.trigger, error ? styles.triggerError : null]}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ?? placeholder}
        </Text>
        <IconCalendar size={18} color={color.ink600} />
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* 안쪽 탭이 backdrop의 onPress(닫기)로 버블링되지 않도록 막습니다 */}
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Calendar
              value={value}
              maxDate={maxDate}
              minDate={minDate}
              onSelect={(date) => {
                onChange(date);
                setOpen(false);
              }}
            />
            <Button
              label="닫기"
              variant="ghost"
              onPress={() => setOpen(false)}
              style={styles.closeButton}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    ...weightFamily('semibold'),
    color: color.ink600,
    marginBottom: space[2],
  },
  trigger: {
    height: 48,
    borderWidth: 1,
    borderColor: color.ink300,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    backgroundColor: color.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerError: {
    borderColor: color.statusCaution,
  },
  valueText: {
    fontSize: 16,
    ...weightFamily('regular'),
    color: color.ink900,
  },
  placeholderText: {
    fontSize: 16,
    ...weightFamily('regular'),
    color: color.ink300,
  },
  errorText: {
    marginTop: space[1],
    fontSize: 12,
    ...weightFamily('regular'),
    color: color.statusCaution,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: color.bg,
    borderRadius: radius.lg,
    padding: space[5],
    alignItems: 'center',
  },
  closeButton: {
    marginTop: space[3],
    width: '100%',
  },
});
